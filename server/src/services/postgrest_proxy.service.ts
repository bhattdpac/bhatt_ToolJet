import { Injectable, NotFoundException } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { EntityManager, In } from 'typeorm';
import { InternalTable } from 'src/entities/internal_table.entity';
import * as proxy from 'express-http-proxy';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { maybeSetSubPath } from '../helpers/utils.helper';

enum PostgresErrorCode {
  NotNullViolation = '23502',
  ForeignKeyViolation = '23503',
  UniqueViolation = '23505',
}

@Injectable()
export class PostgrestProxyService {
  constructor(private readonly manager: EntityManager, private readonly configService: ConfigService) {}

  async perform(req, res, next) {
    const organizationId = req.headers['tj-workspace-id'] || req.dataQuery?.app?.organizationId;
    req.url = await this.replaceTableNamesAtPlaceholder(req, organizationId);
    const authToken = 'Bearer ' + this.signJwtPayload(this.configService.get<string>('PG_USER'));
    req.headers = {};
    req.headers['Authorization'] = authToken;
    req.headers['Prefer'] = 'count=exact'; // To get the total count of records

    res.set('Access-Control-Expose-Headers', 'Content-Range');

    const tableId = req.url.split('?')[0].split('/').pop();
    const internalTable = await this.manager.findOne(InternalTable, {
      where: {
        organizationId,
        id: tableId,
      },
    });

    if (internalTable.tableName) {
      const tableInfo = {};
      tableInfo[tableId] = internalTable.tableName;
      req.headers['tableInfo'] = tableInfo;
    }

    return this.httpProxy(req, res, next);
  }

  private httpProxy = proxy(this.configService.get<string>('PGRST_HOST') || 'http://localhost:3001', {
    userResDecorator: function (proxyRes, proxyResData, userReq, _userRes) {
      if (userReq?.headers?.tableInfo && proxyRes.statusCode >= 400) {
        const customErrorObj = Buffer.isBuffer(proxyResData) ? JSON.parse(proxyResData.toString('utf8')) : proxyResData;

        switch (customErrorObj?.code) {
          case PostgresErrorCode.NotNullViolation:
            customErrorObj.message = 'Violates not null constraint';
            break;
          case PostgresErrorCode.ForeignKeyViolation:
            customErrorObj.message = 'Violates foreign key constraint';
            break;
          case PostgresErrorCode.UniqueViolation:
            customErrorObj.message = 'Violates unique constraint';
            break;
        }

        let customErrorMessage = customErrorObj?.message ?? '';
        if (customErrorMessage) {
          Object.entries(userReq.headers.tableInfo).forEach(([key, value]) => {
            customErrorMessage = customErrorMessage.replace(key, value as string);
          });
          customErrorObj.message = customErrorMessage;
        }
        proxyResData = Buffer.from(JSON.stringify(customErrorObj), 'utf-8');
      }

      return proxyResData;
    },
    proxyReqPathResolver: function (req) {
      const path = '/api/tooljet-db';
      const pathRegex = new RegExp(`${maybeSetSubPath(path)}/proxy`);
      const parts = req.url.split('?');
      const queryString = parts[1];
      const updatedPath = parts[0].replace(pathRegex, '');

      return updatedPath + (queryString ? '?' + queryString : '');
    },
  });

  private signJwtPayload(role: string) {
    const payload = { role };
    const secretKey = this.configService.get<string>('PGRST_JWT_SECRET');
    const token = jwt.sign(payload, secretKey, {
      algorithm: 'HS256',
      expiresIn: '1m',
    });

    return token;
  }

  // The table names are wrapped inside placeholder ${}
  // Example:
  // /proxy/${actors}?select=first_name,last_name,${films}(title)
  // to
  // /proxy/table-id-1?select=first_name,last_name,table-id-2(title)
  async replaceTableNamesAtPlaceholder(req: Request, organizationId: string) {
    const urlToReplace = decodeURIComponent(req.url);
    const placeHolders = urlToReplace.match(/\$\{.+\}/g);

    if (isEmpty(placeHolders)) return req.url;

    const requestedtableNames = placeHolders.map((placeHolder) => placeHolder.slice(2, -1));
    const internalTables = await this.findOrFailAllInternalTableFromTableNames(requestedtableNames, organizationId);
    const internalTableNametoIdMap = requestedtableNames.reduce((acc, tableName) => {
      return {
        ...acc,
        [tableName]: internalTables.find((table) => table.tableName === tableName).id,
      };
    }, {});

    return this.replacePlaceholdersInUrlWithTableIds(internalTableNametoIdMap, requestedtableNames, urlToReplace);
  }

  private replacePlaceholdersInUrlWithTableIds(
    internalTableNametoIdMap: { [x: string]: string },
    tableNames: Array<string>,
    url: string
  ) {
    let urlBeingReplaced = url;

    tableNames.forEach(
      (tableName) =>
        (urlBeingReplaced = urlBeingReplaced.replace('${' + tableName + '}', internalTableNametoIdMap[tableName]))
    );

    return urlBeingReplaced;
  }

  async findOrFailAllInternalTableFromTableNames(requestedTableNames: Array<string>, organizationId: string) {
    const internalTables = await this.manager.find(InternalTable, {
      where: {
        organizationId,
        tableName: In(requestedTableNames),
      },
    });

    const obtainedTableNames = internalTables.map((t) => t.tableName);
    const tableNamesNotInOrg = requestedTableNames.filter((tableName) => !obtainedTableNames.includes(tableName));

    if (isEmpty(tableNamesNotInOrg)) return internalTables;

    throw new NotFoundException('Internal table not found: ' + tableNamesNotInOrg);
  }
}
