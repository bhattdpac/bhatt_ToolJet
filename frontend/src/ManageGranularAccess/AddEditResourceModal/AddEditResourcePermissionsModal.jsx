import React from 'react';
import '../../ManageGroupPermissionsV2/groupPermissions.theme.scss';
import ModalBase from '@/_ui/Modal';
import { AppsSelect } from '@/_ui/Modal/AppsSelect';
import AppPermissionsActions from './AppPermissionActionContainer';

function AddEditResourcePermissionsModal({
  handleClose,
  handleConfirm,
  updateParentState,
  resourceType,
  currentState,
  show,
  title,
  confirmBtnProps,
  disableBuilderLevelUpdate,
  selectedApps,
  setSelectedApps,
  addableApps,
  darkMode,
}) {
  const isCustom = currentState?.isCustom;
  const newPermissionName = currentState?.newPermissionName;
  const initialPermissionState = currentState?.initialPermissionState;
  const errors = currentState?.errors;
  const isAll = currentState?.isAll;

  return (
    <ModalBase
      size="md"
      show={show}
      handleClose={handleClose}
      handleConfirm={handleConfirm}
      className="permission-manager-modal"
      title={title}
      confirmBtnProps={confirmBtnProps}
      darkMode={darkMode}
    >
      <div className="form-group mb-3">
        <label className="form-label bold-text">Permission name</label>
        <div className="tj-app-input">
          <input
            type="text"
            className={`form-control ${newPermissionName?.length == 50 ? 'error-input' : ''}`}
            placeholder={'Eg. Product analytics apps'}
            name="permissionName"
            value={newPermissionName}
            onChange={(e) => {
              if (e.target.value?.length < 51)
                updateParentState(() => ({
                  newPermissionName: e.target.value,
                }));
            }}
          />
          <span className="text-danger">{errors['permissionName']}</span>
        </div>
        <div className={`mt-1 tj-text-xxsm ${newPermissionName?.length == 50 ? 'error-text' : ''}`}>
          <div data-cy="workspace-login-help-text">Permission name must be unique and max 50 characters</div>
        </div>
      </div>
      {/* Till here */}
      <div className="form-group mb-3">
        <label className="form-label bold-text">Permission</label>
        <AppPermissionsActions
          handleClickEdit={() => {
            updateParentState((prevState) => ({
              initialPermissionState: {
                ...prevState.initialPermissionState,
                canEdit: !prevState.initialPermissionState.canEdit,
                canView: prevState.initialPermissionState.canEdit,
                ...(prevState.initialPermissionState.canEdit && { hideFromDashboard: false }),
              },
            }));
          }}
          handleClickView={() => {
            updateParentState((prevState) => ({
              initialPermissionState: {
                ...prevState.initialPermissionState,
                canView: !prevState.initialPermissionState.canView,
                canEdit: prevState.initialPermissionState.canView,
                ...(prevState.initialPermissionState.canEdit && { hideFromDashboard: false }),
              },
            }));
          }}
          handleHideFromDashboard={() => {
            updateParentState((prevState) => ({
              initialPermissionState: {
                ...initialPermissionState,
                hideFromDashboard: !prevState.initialPermissionState.hideFromDashboard,
              },
            }));
          }}
          disableBuilderLevelUpdate={disableBuilderLevelUpdate}
          initialPermissionState={initialPermissionState}
        />
      </div>

      <div className="form-group mb-3">
        <label className="form-label bold-text">Resources</label>
        <div className="resources-container">
          <label className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              checked={isAll}
              onClick={() => {
                !isAll && updateParentState((prevState) => ({ isAll: !prevState.isAll, isCustom: !!prevState.isAll }));
              }}
            />
            <div>
              <span className="form-check-label text-muted">All apps</span>
              <span className="text-muted tj-text-xsm">
                This will select all apps in the workspace including any new apps created
              </span>
            </div>
          </label>
          <label className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              disabled={addableApps.length === 0 || disableBuilderLevelUpdate}
              checked={isCustom}
              onClick={() => {
                !isCustom &&
                  updateParentState((prevState) => ({ isCustom: !prevState.isCustom, isAll: prevState.isCustom }));
              }}
            />
            <div>
              <span className="form-check-label text-muted">Custom</span>
              <span className="text-muted tj-text-xsm">Select specific applications you want to add to the group</span>
            </div>
          </label>
          <AppsSelect
            disabled={!isCustom}
            allowSelectAll={true}
            value={selectedApps}
            onChange={setSelectedApps}
            options={addableApps}
          />
        </div>
      </div>
    </ModalBase>
  );
}

export default AddEditResourcePermissionsModal;
