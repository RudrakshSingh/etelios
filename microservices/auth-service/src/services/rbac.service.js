class RbacService {
    constructor() {
      this.rolePermissions = {
        admin: ['create_user', 'delete_user', 'view_reports', 'manage_assets'],
        hr: ['create_user', 'view_reports', 'manage_transfers'],
        manager: ['view_reports', 'approve_attendance', 'manage_assets'],
        salesman: ['mark_attendance', 'view_schedule'],
      };
    }
  
    hasPermission(role, permission) {
      const permissions = this.rolePermissions[role] || [];
      return permissions.includes(permission);
    }
  }
  
  module.exports = new RbacService();
  