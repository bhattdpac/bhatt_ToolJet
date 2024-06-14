import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ResourceType } from '@module/user_resource_permissions/constants/granular-permissions.constant';
import {
  ResourceGroupActions,
  GranularPermissionAddResourceItems,
  GranularPermissionDeleteResourceItems,
  CreateAppsPermissionsObject,
} from '@module/user_resource_permissions/interface/granular-permissions.interface';

export class CreateGranularPermissionDto {
  @IsString()
  @Transform(({ value }) => value.trim())
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsBoolean()
  @IsNotEmpty()
  isAll: boolean;

  @IsEnum(ResourceType)
  @IsNotEmpty()
  type: ResourceType;

  @IsOptional()
  createAppsPermissionsObject: CreateAppsPermissionsObject;
}

export class UpdateGranularPermissionDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsBoolean()
  @IsOptional()
  isAll: boolean;

  @IsOptional()
  actions: ResourceGroupActions;

  @IsOptional()
  resourcesToAdd: GranularPermissionAddResourceItems;

  @IsOptional()
  resourcesToDelete: GranularPermissionDeleteResourceItems;
}