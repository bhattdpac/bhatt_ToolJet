import React from 'react';
import '../../ManageGroupPermissionsV2/groupPermissions.theme.scss';

function AppPermissionsActions({
  handleClickEdit,
  handleClickView,
  handleHideFromDashboard,
  disableBuilderLevelUpdate,
  initialPermissionState,
}) {
  return (
    <div className="type-container">
      <div className="left-container">
        <label className="form-check form-check-inline">
          <input
            className="form-check-input"
            type="radio"
            disabled={disableBuilderLevelUpdate}
            checked={initialPermissionState.canEdit}
            onClick={() => {
              !initialPermissionState.canEdit && handleClickEdit();
            }}
          />

          <div>
            <span className="form-check-label text-muted">Edit</span>
            <span className="text-muted tj-text-xsm">Access to app builder</span>
          </div>
        </label>
      </div>
      <div className="right-container">
        <label className="form-check form-check-inline">
          <input
            className="form-check-input"
            type="radio"
            disabled={disableBuilderLevelUpdate}
            checked={initialPermissionState.canView}
            onClick={() => {
              !initialPermissionState.canView && handleClickView();
            }}
          />
          <div>
            <span className="form-check-label text-muted">View</span>
            <span className="text-muted tj-text-xsm">Only view deployed version of app</span>
          </div>
        </label>
        <label className="form-check form-check-inline">
          <input
            className="form-check-input"
            type="checkbox"
            disabled={!initialPermissionState.canView}
            checked={initialPermissionState.hideFromDashboard}
            onClick={() => {
              handleHideFromDashboard();
            }}
          />
          <div>
            <span className={`form-check-label faded-text`}>Hide from dashboard</span>
            <span className="text-muted tj-text-xsm">App will be accessible by URL only</span>
          </div>
        </label>
      </div>
    </div>
  );
}

export default AppPermissionsActions;