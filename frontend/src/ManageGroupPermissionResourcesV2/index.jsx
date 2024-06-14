import React from 'react';
import cx from 'classnames';
import { groupPermissionService, groupPermissionV2Service } from '@/_services';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import ErrorBoundary from '@/Editor/ErrorBoundary';
import { Loader } from '../ManageSSO/Loader';
import SolidIcon from '@/_ui/Icon/solidIcons/index';
import BulkIcon from '@/_ui/Icon/bulkIcons/index';
import Multiselect from '@/_ui/Multiselect/Multiselect';
import { FilterPreview, MultiSelectUser } from '@/_components';
import { ButtonSolid } from '@/_ui/AppButton/AppButton';
import ModalBase from '@/_ui/Modal';
import Select from '@/_ui/Select';
import { ManageGranularAccess } from '@/ManageGranularAccess';
import './grpPermissionResc.theme.scss';
import { EDIT_ROLE_MESSAGE } from './constant';
import { SearchBox } from '@/_components/SearchBox';
import EditRoleErrorModal from '@/ManageGroupPermissionsV2/ErrorModal/ErrorModal';
class ManageGroupPermissionResourcesComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoadingGroup: true,
      isLoadingApps: true,
      isAddingApps: false,
      isLoadingUsers: true,
      isAddingUsers: false,
      groupPermission: null,
      usersInGroup: [],
      appsInGroup: [],
      addableApps: [],
      usersNotInGroup: [],
      appsNotInGroup: [],
      selectedAppIds: [],
      removeAppIds: [],
      currentTab: 'users',
      selectedUsers: [],
      isChangeRoleModalOpen: false,
      updatingUserRole: null,
      isAddUsersToRoleModalOpen: false,
      isRoleGroup: false,
      selectedNewRole: '',
      showRoleEditMessage: false,
      showUserSearchBox: false,
      errorListItems: [],
      errorMessage: '',
      errorTitle: '',
      showEditRoleErrorModal: false,
      errorIconName: '',
    };
  }

  componentDidMount() {
    if (this.props.groupPermissionId) this.fetchGroupAndResources(this.props.groupPermissionId);
  }

  componentDidUpdate(prevProps) {
    if (this.props.groupPermissionId && this.props.groupPermissionId !== prevProps.groupPermissionId) {
      this.fetchGroupAndResources(this.props.groupPermissionId);
    }
  }

  fetchGroupPermission = (groupPermissionId) => {
    groupPermissionV2Service.getGroup(groupPermissionId).then((data) => {
      this.setState((prevState) => {
        return {
          isRoleGroup: data.type === 'default',
          groupPermission: data,
          currentTab: prevState.currentTab,
          isLoadingGroup: false,
        };
      });
    });
  };

  fetchGroupAndResources = (groupPermissionId) => {
    this.setState({ isLoadingGroup: true });
    this.fetchGroupPermission(groupPermissionId);
    this.fetchUsersInGroup(groupPermissionId);
    // this.fetchAppsNotInGroup(groupPermissionId);
    // this.fetchAppsInGroup(groupPermissionId);
  };

  userFullName = (user) => {
    return `${user?.first_name} ${user?.last_name ?? ''}`;
  };

  searchUsersNotInGroup = async (query, groupPermissionId) => {
    return new Promise((resolve, reject) => {
      groupPermissionV2Service
        .getUsersNotInGroup(query, groupPermissionId)
        .then((users) => {
          resolve(
            users.map((user) => {
              return {
                name: `${this.userFullName(user)} (${user.email})`,
                value: user.id,
                first_name: user.firstName,
                last_name: user.lastName,
                email: user.email,
              };
            })
          );
        })
        .catch(reject);
    });
  };

  fetchUsersInGroup = (groupPermissionId, searchString = '') => {
    groupPermissionV2Service.getUsersInGroup(groupPermissionId, searchString).then((data) => {
      this.setState({
        usersInGroup: data,
        isLoadingUsers: false,
      });
    });
  };

  fetchAppsNotInGroup = (groupPermissionId) => {
    groupPermissionService.getAppsNotInGroup(groupPermissionId).then((data) => {
      this.setState({
        appsNotInGroup: data.apps,
      });
    });
  };

  fetchAppsInGroup = (groupPermissionId) => {
    groupPermissionService.getAppsInGroup(groupPermissionId).then((data) => {
      this.setState({
        appsInGroup: data.apps,
        isLoadingApps: false,
      });
    });
  };

  clearErrorState = () => {
    this.setState({
      errorMessage: '',
      showEditRoleErrorModal: false,
      errorListItems: [],
      errorTitle: '',
      errorIconName: '',
      selectedUsers: [],
      isLoadingUsers: false,
      isAddingUsers: false,
    });
  };

  updateGroupPermission = (groupPermissionId, params) => {
    groupPermissionV2Service
      .update(groupPermissionId, params)
      .then(() => {
        toast.success('Group permissions updated');
        this.fetchGroupPermission(groupPermissionId);
      })
      .catch(({ error }) => {
        console.log(error);
        this.setState({
          errorMessage: error?.error,
          showEditRoleErrorModal: true,
          errorListItems: error?.data,
          errorTitle: error?.title ? error?.title : 'Cannot add this permission to the group',
          errorIconName: 'lock',
        });
      });
  };

  updateAppGroupPermission = (app, groupPermissionId, action) => {
    const appGroupPermission = app.app_group_permissions.find(
      (permission) => permission.group_permission_id === groupPermissionId
    );

    let actionParams = {
      read: true,
      update: action === 'edit',
    };

    if (action === 'hideFromDashboard') {
      actionParams['hideFromDashboard'] = !this.canAppGroupPermission(app, groupPermissionId, 'hideFromDashboard');
    }

    if (action === 'edit') actionParams['hideFromDashboard'] = false;

    groupPermissionService
      .updateAppGroupPermission(groupPermissionId, appGroupPermission.id, actionParams)
      .then(() => {
        toast.success('App permissions updated');

        this.fetchAppsInGroup(groupPermissionId);
      })
      .catch(({ error }) => {
        toast.error(error);
      });
  };

  canAppGroupPermission = (app, groupPermissionId, action) => {
    let appGroupPermission = this.findAppGroupPermission(app, groupPermissionId);
    switch (action) {
      case 'edit':
        return appGroupPermission?.read && appGroupPermission?.update;
      case 'view':
        return appGroupPermission?.read && !appGroupPermission?.update;
      case 'hideFromDashboard':
        return appGroupPermission?.read && appGroupPermission?.read_on_dashboard;
      default:
        return false;
    }
  };

  findAppGroupPermission = (app, groupPermissionId) => {
    return app.app_group_permissions.find((permission) => permission.group_permission_id === groupPermissionId);
  };

  setSelectedUsers = (value) => {
    console.log('user value');
    console.log(value);
    this.setState({
      selectedUsers: value,
    });
  };

  setSelectedApps = (value) => {
    this.setState({
      selectedAppIds: value,
    });
  };

  addSelectedAppsToGroup = (groupPermissionId) => {
    this.setState({ isAddingApps: true });
    const updateParams = {
      add_apps: this.state.selectedAppIds.map((app) => app.value),
    };
    groupPermissionService
      .update(groupPermissionId, updateParams)
      .then(() => {
        this.setState({
          selectedAppIds: [],
          isLoadingApps: true,
          isAddingApps: false,
        });
        this.fetchAppsNotInGroup(groupPermissionId);
        this.fetchAppsInGroup(groupPermissionId);
      })
      .then(() => {
        toast.success('Apps added to the group');
        this.setState({
          selectedApps: [],
        });
      })
      .catch(({ error }) => {
        toast.error(error);
      });
  };

  removeAppFromGroup = (groupPermissionId, appId, appName) => {
    if (window.confirm(`Are you sure you want to delete this app - ${appName}?`) === false) return;
    const updateParams = {
      remove_apps: [appId],
    };
    groupPermissionService
      .update(groupPermissionId, updateParams)
      .then(() => {
        this.setState({ removeAppIds: [], isLoadingApps: true });
        this.fetchAppsNotInGroup(groupPermissionId);
        this.fetchAppsInGroup(groupPermissionId);
      })
      .then(() => {
        toast.success('App removed from the group');
      })
      .catch(({ error }) => {
        toast.error(error);
      });
  };

  addSelectedUsersToGroup = (groupPermissionId, selectedUsers) => {
    this.setState({ isAddingUsers: true });
    const body = {
      userIds: selectedUsers.map((user) => user.value),
      groupId: groupPermissionId,
    };
    groupPermissionV2Service
      .addUsersInGroups(body)
      .then(() => {
        console.log('this is running');
        this.setState({
          selectedUsers: [],
          isLoadingUsers: true,
          isAddingUsers: false,
        });
        toast.success('Users added to the group');
        this.fetchUsersInGroup(groupPermissionId);
      })
      .catch(({ error }) => {
        this.setState({
          showEditRoleErrorModal: true,
          errorTitle: error?.title,
          errorMessage: error?.error,
          errorIconName: 'usergear',
          isAddingUsers: false,
        });
      });
  };

  removeUserFromGroup = (groupUserId) => {
    const { groupPermission } = this.state;
    groupPermissionV2Service
      .deleteUserFromGroup(groupUserId)
      .then(() => {
        this.setState({ removeUserIds: [], isLoadingUsers: true });
        this.fetchUsersInGroup(groupPermission.id);
      })
      .then(() => {
        toast.success('User removed from the group');
      })
      .catch(({ error }) => {
        toast.error(error);
      });
  };

  showPermissionText = () => {
    const { groupPermission } = this.state;
    const text =
      groupPermission.name === 'admin'
        ? 'Admin has edit access to all apps. These are not editable'
        : 'End-user can only have permission to view apps';
    return (
      <div className="manage-group-users-info">
        <p
          className="tj-text-xsm"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          data-cy="helper-text-admin-app-access"
        >
          <SolidIcon name="information" fill="#3E63DD" /> {text}
          <a style={{ margin: '0', padding: '0', textDecoration: 'none', color: '#3E63DD' }}>Read Documentation</a> to
          know more
        </p>
      </div>
    );
  };

  removeSelection = (selected, value) => {
    const updatedData = selected.filter((d) => d.value !== value);
    this.setSelectedUsers([...updatedData]);
  };

  setErrorState = (state = {}) => {
    this.setState({
      ...state,
    });
  };

  updateUserRole = () => {
    console.log('logging update user');
    const { updatingUserRole, groupPermission, selectedNewRole } = this.state;
    this.setState({
      isLoadingUsers: true,
    });
    const body = {
      newRole: selectedNewRole,
      userId: updatingUserRole.id,
    };
    groupPermissionV2Service
      .updateUserRole(body)
      .then(() => {
        this.fetchUsersInGroup(groupPermission.id);
        toast.success('Role updated successfully');
      })
      .catch(({ error }) => {
        this.setState({
          showEditRoleErrorModal: true,
          errorTitle: error?.title ? error?.title : 'Cannot remove last admin',
          errorMessage: error.error,
          errorIconName: 'usergear',
          errorListItems: error.data,
        });
      })
      .finally(() => {
        this.closeChangeRoleModal();
      });
  };
  closeChangeRoleModal = () =>
    this.setState({
      isChangeRoleModalOpen: false,
      showRoleEditMessage: false,
      updatingUserRole: null,
      selectedNewRole: null,
      isLoadingUsers: false,
    });

  changeThisComponentState = (state = {}) => {
    console.log('this is changing');
    this.setState(state);
  };

  generateSelection = (selected) => {
    return selected?.map((d) => {
      return (
        <div className="selected-item tj-ms" key={d.value}>
          <FilterPreview text={`${d?.email}`} onClose={() => this.removeSelection(selected, d.value)} />
        </div>
      );
    });
  };

  openChangeRoleModal = (updatingUser) =>
    this.setState({ isChangeRoleModalOpen: true, updatingUserRole: updatingUser });

  showChangeRoleModalMessage = () => {
    this.setState({ showRoleEditMessage: true });
  };

  handleUserSearchInGroup = (e) => {
    this.fetchUsersInGroup(this.props.groupPermissionId, e?.target?.value);
  };

  toggleUserTabSearchBox = () => {
    this.fetchUsersInGroup(this.props.groupPermissionId);
    this.setState((prevState) => ({
      showUserSearchBox: !prevState.showUserSearchBox,
    }));
  };

  toggleAddUsersToRoleModal = () => this.setState({ isAddUsersToRoleModalOpen: !this.state.isAddUsersToRoleModalOpen });

  render() {
    if (!this.props.groupPermissionId) return null;

    const {
      isLoadingGroup,
      isLoadingUsers,
      isAddingUsers,
      appsNotInGroup,
      usersInGroup,
      groupPermission,
      currentTab,
      selectedUsers,
      isChangeRoleModalOpen,
      isAddUsersToRoleModalOpen,
      updatingUserRole,
      isRoleGroup,
      selectedNewRole,
      showRoleEditMessage,
      showUserSearchBox,
      errorListItems,
      errorMessage,
      errorTitle,
      showEditRoleErrorModal,
      errorIconName,
      addableApps,
      granularPermissions,
    } = this.state;

    const isBasicPlan = false;

    const searchSelectClass = this.props.darkMode ? 'select-search-dark' : 'select-search';
    const showPermissionInfo =
      isRoleGroup && (groupPermission?.name === 'admin' || groupPermission?.name === 'end-user');
    const disablePermissionUpdate =
      isBasicPlan || groupPermission?.name === 'admin' || groupPermission?.name === 'end-user';
    const appSelectOptions = appsNotInGroup.map((app) => {
      return { name: app.name, value: app.id };
    });

    return (
      <ErrorBoundary showFallback={false}>
        <EditRoleErrorModal
          darkMode={this.props.darkMode}
          show={showEditRoleErrorModal}
          errorMessage={errorMessage}
          errorTitle={errorTitle}
          listItems={errorListItems}
          iconName={errorIconName}
          onClose={this.clearErrorState}
        />
        <ModalBase
          title={
            <div className="my-3" data-cy="modal-title">
              <span className="tj-text-md font-weight-500">Edit user role</span>
              <div className="tj-text-sm text-muted" data-cy="user-email">
                {updatingUserRole?.email}
              </div>
            </div>
          }
          handleConfirm={
            EDIT_ROLE_MESSAGE?.[groupPermission?.name]?.[selectedNewRole] && !showRoleEditMessage
              ? this.showChangeRoleModalMessage
              : this.updateUserRole
          }
          show={isChangeRoleModalOpen}
          isLoading={isLoadingUsers}
          handleClose={this.closeChangeRoleModal}
          confirmBtnProps={{ title: 'Continue' }}
          darkMode={this.props.darkMode}
        >
          {selectedNewRole && showRoleEditMessage ? (
            <div>{EDIT_ROLE_MESSAGE?.[groupPermission?.name]?.[selectedNewRole]()}</div>
          ) : (
            <div>
              <label className="form-label text-muted">User role</label>
              <Select
                options={this.props.roleOptions.filter((group) => group.value !== groupPermission?.name)}
                value={selectedNewRole}
                width={'100%'}
                useMenuPortal={false}
                onChange={(selectedOption) => {
                  this.setState({
                    selectedNewRole: selectedOption,
                  });
                }}
                placeholder="Select new role of user"
              />
              <div className="info-container">
                <div className="col-md-1 info-btn">
                  <SolidIcon name="information" fill="#3E63DD" />
                </div>
                <div className="col-md-11">
                  <div className="message" data-cy="warning-text">
                    <p>
                      Users must be always be part of one default group. This will define the user count in your plan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBase>
        <ModalBase
          title={
            <div className="my-3" data-cy="modal-title">
              <span className="tj-text-md font-weight-500">Edit user role</span>
              <div className="tj-text-sm text-muted" data-cy="user-email">
                {updatingUserRole?.email}
              </div>
            </div>
          }
          show={isAddUsersToRoleModalOpen}
          handleClose={this.toggleAddUsersToRoleModal}
          darkMode={this.props.darkMode}
        >
          <p className="tj-text-sm">
            Changing user default group from builder to end-user will affect the count of users covered by your plan.
          </p>
          <br />
          <p className="tj-text-sm">
            This will also remove the user from any custom groups with builder-like permissions. Are you sure you want
            to continue?
          </p>
        </ModalBase>
        <div className="org-users-page animation-fade">
          {isLoadingGroup ? (
            <Loader />
          ) : (
            <div>
              <div className="justify-content-between d-flex groups-main-header-wrap">
                <p
                  className="font-weight-500 tj-text-md"
                  // data-cy={`${this.props.selectedGroup.toLowerCase().replace(/\s+/g, '-')}-title`}
                >
                  {this.props.selectedGroup}
                </p>
                {groupPermission.type === 'default' && (
                  <div className="default-group-wrap">
                    <SolidIcon name="information" fill="#46A758" width="13" />
                    <p className="font-weight-500 tj-text-xsm" data-cy="text-default-group">
                      Default group
                    </p>
                  </div>
                )}
                {groupPermission.type === 'custom' && (
                  <div className="user-group-actions">
                    <Link
                      onClick={() => this.props.updateGroupName(groupPermission)}
                      data-cy={`${String(groupPermission.group)
                        .toLowerCase()
                        .replace(/\s+/g, '-')}-group-name-update-link`}
                      className="tj-text-xsm font-weight-500 edit-group"
                    >
                      <SolidIcon name="editrectangle" width="14" />
                      Rename
                    </Link>
                  </div>
                )}
              </div>

              <nav className="nav nav-tabs groups-sub-header-wrap">
                <a
                  onClick={() => this.setState({ currentTab: 'users' })}
                  className={cx('nav-item nav-link', { active: currentTab === 'users' })}
                  data-cy="users-link"
                >
                  <SolidIcon
                    name="usergroup"
                    fill={currentTab === 'users' ? '#3E63DD' : '#C1C8CD'}
                    className="manage-group-tab-icons"
                    width="16"
                  ></SolidIcon>

                  {this.props.t('header.organization.menus.manageGroups.permissionResources.users', 'Users')}
                </a>

                <a
                  onClick={() => this.setState({ currentTab: 'permissions' })}
                  className={cx('nav-item nav-link', { active: currentTab === 'permissions' })}
                  data-cy="permissions-link"
                >
                  <SolidIcon
                    className="manage-group-tab-icons"
                    fill={currentTab === 'permissions' ? '#3E63DD' : '#C1C8CD'}
                    name="lock"
                    width="16"
                  ></SolidIcon>

                  {this.props.t(
                    'header.organization.menus.manageGroups.permissionResources.permissions',
                    'Permissions'
                  )}
                </a>
                <a
                  onClick={() => this.setState({ currentTab: 'granularAccess' })}
                  className={cx('nav-item nav-link', { active: currentTab === 'granularAccess' })}
                  data-cy="granular-access-link"
                >
                  <SolidIcon
                    className="manage-group-tab-icons"
                    fill={currentTab === 'granularAccess' ? '#3E63DD' : '#C1C8CD'}
                    name="granularaccess"
                    width="16"
                  ></SolidIcon>
                  Granular Access
                </a>
              </nav>

              <div className="manage-groups-body">
                <div className="tab-content">
                  {/* Users Tab */}
                  <div className={`tab-pane ${currentTab === 'users' ? 'active show' : ''}`}>
                    {!isRoleGroup && (
                      <div className="row">
                        <div className="col" data-cy="multi-select-search">
                          <MultiSelectUser
                            className={{
                              container: searchSelectClass,
                              value: `${searchSelectClass}__value`,
                              input: `${searchSelectClass}__input`,
                              select: `${searchSelectClass}__select`,
                              options: `${searchSelectClass}__options`,
                              row: `${searchSelectClass}__row`,
                              option: `${searchSelectClass}__option`,
                              group: `${searchSelectClass}__group`,
                              'group-header': `${searchSelectClass}__group-header`,
                              'is-selected': 'is-selected',
                              'is-highlighted': 'is-highlighted',
                              'is-loading': 'is-loading',
                              'is-multiple': 'is-multiple',
                              'has-focus': 'has-focus',
                              'not-found': `${searchSelectClass}__not-found`,
                            }}
                            onSelect={this.setSelectedUsers}
                            onSearch={(query) => this.searchUsersNotInGroup(query, groupPermission.id)}
                            selectedValues={selectedUsers}
                            onReset={() => this.setSelectedUsers([])}
                            placeholder="Select users to add to the group"
                            searchLabel="Enter name or email"
                          />
                        </div>
                        <div className="col-auto">
                          <ButtonSolid
                            onClick={() => this.addSelectedUsersToGroup(groupPermission?.id, selectedUsers)}
                            disabled={selectedUsers.length === 0}
                            leftIcon="plus"
                            fill={selectedUsers.length !== 0 ? '#3E63DD' : this.props.darkMode ? '#131620' : '#C1C8CD'}
                            iconWidth="16"
                            className="add-users-button"
                            isLoading={isAddingUsers}
                            data-cy={`${String(groupPermission.group)
                              .toLowerCase()
                              .replace(/\s+/g, '-')}-group-add-button`}
                          >
                            Add users
                          </ButtonSolid>
                        </div>
                        {selectedUsers.length && (
                          <div className="row mt-2">
                            <div className="selected-section">
                              <div className="selected-text">Selected Users:</div>
                              {this.generateSelection(selectedUsers)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <br />
                    <div>
                      {showUserSearchBox ? (
                        <div className="searchbox-custom">
                          <SearchBox
                            dataCy={`query-manager`}
                            width="600px !important"
                            callBack={this.handleUserSearchInGroup}
                            placeholder={'Search'}
                            customClass="tj-common-search-input-user"
                            onClearCallback={this.toggleUserTabSearchBox}
                            autoFocus={true}
                          />
                        </div>
                      ) : (
                        <div className="manage-group-table-head">
                          <ButtonSolid
                            onClick={(e) => {
                              e.preventDefault();
                              this.toggleUserTabSearchBox();
                            }}
                            size="xsm"
                            rightIcon="search"
                            iconWidth="15"
                            className="search-user-group-btn"
                          />
                          <p className="tj-text-xsm" data-cy="name-header">
                            User name
                          </p>
                          <p className="tj-text-xsm" data-cy="email-header">
                            Email id
                          </p>
                          <div className="edit-role-btn"></div> {/* DO NOT REMOVE FOR TABLE ALIGNMENT  */}
                        </div>
                      )}

                      <section>
                        {isLoadingGroup || isLoadingUsers ? (
                          <tr>
                            <td className="col-auto">
                              <div className="row">
                                <div className="skeleton-line w-10 col mx-3"></div>
                              </div>
                            </td>
                            <td className="col-auto">
                              <div className="skeleton-line w-10"></div>
                            </td>
                            <td className="col-auto">
                              <div className="skeleton-line w-10"></div>
                            </td>
                          </tr>
                        ) : usersInGroup.length > 0 || showUserSearchBox ? (
                          usersInGroup.map((item) => {
                            const user = item.user;
                            const groupUserId = item.id;
                            console.log(user);
                            return (
                              <div
                                key={user.id}
                                className="manage-group-users-row"
                                data-cy={`${String(user.email).toLowerCase().replace(/\s+/g, '-')}-user-row`}
                              >
                                <p className="tj-text-sm d-flex align-items-center">
                                  <div className="name-avatar">
                                    {`${user?.firstName?.[0] ?? ''} ${user?.lastName?.[0] ?? ''}`}
                                  </div>
                                  <span>{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}</span>
                                </p>
                                <p className="tj-text-sm" style={{ paddingLeft: '8px' }}>
                                  <span> {user.email}</span>
                                </p>
                                <div className="edit-role-btn">
                                  {!isRoleGroup && (
                                    <Link to="#" className="remove-decoration">
                                      <ButtonSolid
                                        variant="dangerSecondary"
                                        className="apps-remove-btn remove-decoration tj-text-xsm font-weight-600"
                                        onClick={() => {
                                          this.removeUserFromGroup(groupUserId);
                                        }}
                                      >
                                        {this.props.t('globals.delete', 'Delete')}
                                      </ButtonSolid>
                                    </Link>
                                  )}
                                </div>
                                {isRoleGroup && (
                                  <div className="edit-role-btn">
                                    <ButtonSolid
                                      variant="tertiary"
                                      iconWidth="17"
                                      fill="var(--slate9)"
                                      className="apps-remove-btn remove-decoration tj-text-xsm font-weight-600"
                                      leftIcon="editable"
                                      onClick={() => {
                                        this.openChangeRoleModal(user);
                                      }}
                                    >
                                      Edit role
                                    </ButtonSolid>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="manage-groups-no-apps-wrap">
                            <div className="manage-groups-no-apps-icon">
                              <BulkIcon name="users" fill="#3E63DD" width="48" />
                            </div>
                            <p className="tj-text-md font-weight-500" data-cy="helper-text-no-apps-added">
                              No users added yet
                            </p>
                            <span className="tj-text-sm text-center" data-cy="helper-text-user-groups-permissions">
                              Add users to this group to configure
                              <br /> permissions for them!
                            </span>
                          </div>
                        )}
                      </section>
                    </div>
                  </div>

                  {/* Permissions Tab */}

                  <aside className={`tab-pane ${currentTab === 'permissions' ? 'active show' : ''}`}>
                    <div>
                      <div>
                        <div>
                          {showPermissionInfo && this.showPermissionText()}
                          <div className="manage-group-permision-header">
                            <p data-cy="resource-header" className="tj-text-xsm">
                              {this.props.t(
                                'header.organization.menus.manageGroups.permissionResources.resource',
                                'Resource'
                              )}
                            </p>
                            <p data-cy="permissions-header" className="tj-text-xsm">
                              {this.props.t(
                                'header.organization.menus.manageGroups.permissionResources.permissions',
                                'Permissions'
                              )}
                            </p>
                          </div>
                          <div className="permission-body">
                            {isLoadingGroup ? (
                              <tr>
                                <td className="col-auto">
                                  <div className="row">
                                    <div className="skeleton-line w-10 col mx-3"></div>
                                  </div>
                                </td>
                                <td className="col-auto">
                                  <div className="skeleton-line w-10"></div>
                                </td>
                                <td className="col-auto">
                                  <div className="skeleton-line w-10"></div>
                                </td>
                              </tr>
                            ) : (
                              <>
                                <div className="manage-groups-permission-apps">
                                  <div data-cy="resource-apps">
                                    {this.props.t(
                                      'header.organization.menus.manageGroups.permissionResources.apps',
                                      'Apps'
                                    )}
                                  </div>
                                  <div className="text-muted">
                                    <div className="d-flex apps-permission-wrap flex-column">
                                      <label className="form-check form-check-inline">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          onChange={() => {
                                            this.updateGroupPermission(groupPermission.id, {
                                              appCreate: !groupPermission.appCreate,
                                            });
                                          }}
                                          checked={groupPermission.appCreate}
                                          disabled={disablePermissionUpdate}
                                          data-cy="app-create-checkbox"
                                        />
                                        <span className="form-check-label" data-cy="app-create-label">
                                          {this.props.t('globals.create', 'Create')}
                                        </span>
                                        <span
                                          class={`text-muted tj-text-xxsm ${
                                            disablePermissionUpdate && 'check-label-disable'
                                          }`}
                                        >
                                          Create apps in this workspace
                                        </span>
                                      </label>
                                      <label className="form-check form-check-inline">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          onChange={() => {
                                            this.updateGroupPermission(groupPermission.id, {
                                              appDelete: !groupPermission.appDelete,
                                            });
                                          }}
                                          checked={groupPermission.appDelete}
                                          disabled={disablePermissionUpdate}
                                          data-cy="app-delete-checkbox"
                                        />
                                        <span className="form-check-label" data-cy="app-delete-label">
                                          {this.props.t('globals.delete', 'Delete')}
                                        </span>
                                        <span
                                          class={`text-muted tj-text-xxsm ${
                                            disablePermissionUpdate && 'check-label-disable'
                                          }`}
                                        >
                                          Delete any app in this workspace
                                        </span>
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                <div className="apps-folder-permission-wrap">
                                  <div data-cy="resource-folders">
                                    {this.props.t(
                                      'header.organization.menus.manageGroups.permissionResources.folder',
                                      'Folder'
                                    )}
                                  </div>
                                  <div className="text-muted">
                                    <div>
                                      <label className="form-check form-check-inline">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          onChange={() => {
                                            this.updateGroupPermission(groupPermission.id, {
                                              folderCRUD: !groupPermission.folderCRUD,
                                            });
                                          }}
                                          checked={groupPermission.folderCRUD}
                                          disabled={disablePermissionUpdate}
                                          data-cy="folder-create-checkbox"
                                        />
                                        <span className="form-check-label" data-cy="folder-create-label">
                                          {this.props.t(
                                            'header.organization.menus.manageGroups.permissionResources.createUpdateDelete',
                                            'Create/Update/Delete'
                                          )}
                                        </span>
                                        <span
                                          class={`text-muted tj-text-xxsm ${
                                            disablePermissionUpdate && 'check-label-disable'
                                          }`}
                                        >
                                          All operations on folders
                                        </span>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                <div className="apps-variable-permission-wrap">
                                  <div data-cy="resource-workspace-variable">
                                    {this.props.t('globals.environmentVar', 'Workspace constant/variable')}
                                  </div>
                                  <div className="text-muted">
                                    <div>
                                      <label className="form-check form-check-inline">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          onChange={() => {
                                            this.updateGroupPermission(groupPermission.id, {
                                              orgConstantCRUD: !groupPermission.orgConstantCRUD,
                                            });
                                          }}
                                          checked={groupPermission.orgConstantCRUD}
                                          disabled={disablePermissionUpdate}
                                          data-cy="env-variable-checkbox"
                                        />
                                        <span className="form-check-label" data-cy="workspace-variable-create-label">
                                          {this.props.t(
                                            'header.organization.menus.manageGroups.permissionResources.createUpdateDelete',
                                            'Create/Update/Delete'
                                          )}
                                        </span>
                                        <span
                                          class={`text-muted tj-text-xxsm ${
                                            disablePermissionUpdate && 'check-label-disable'
                                          }`}
                                        >
                                          All operations on workspace constants
                                        </span>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </aside>

                  {/* Granular Access */}
                  <aside className={`tab-pane ${currentTab === 'granularAccess' ? 'active show' : ''}`}>
                    <ManageGranularAccess
                      groupPermissionId={groupPermission.id}
                      groupPermission={groupPermission}
                      setErrorState={this.setErrorState}
                      updateParentState={this.changeThisComponentState}
                    />
                  </aside>
                </div>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    );
  }
}

export const ManageGroupPermissionResourcesV2 = withTranslation()(ManageGroupPermissionResourcesComponent);