const mongoose = require('mongoose');

const dashboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'employee'],
    unique: true
  },
  layout: {
    type: String,
    required: true,
    enum: ['grid', 'sidebar', 'tabs', 'cards']
  },
  widgets: [{
    widget_id: {
      type: String,
      required: true
    },
    widget_type: {
      type: String,
      required: true,
      enum: [
        'chart', 'table', 'metric', 'list', 'calendar', 'map', 'progress', 'gauge'
      ]
    },
    title: {
      type: String,
      required: true
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    },
    permissions: [{
      type: String,
      enum: [
        'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
        'view_transfer_requests', 'view_document_status', 'view_store_performance',
        'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
        'view_transfer_chart', 'view_document_chart', 'view_store_chart',
        'view_recent_activities', 'view_pending_approvals', 'view_system_alerts',
        'view_attendance_trends', 'view_employee_trends', 'view_asset_trends',
        'view_compliance_status', 'view_audit_logs', 'view_system_metrics'
      ]
    }],
    data_source: {
      type: String,
      required: true,
      enum: [
        'attendance', 'employees', 'assets', 'transfers', 'documents', 'stores',
        'reports', 'audit_logs', 'system_metrics', 'compliance'
      ]
    },
    refresh_interval: {
      type: Number,
      default: 300000 // 5 minutes in milliseconds
    },
    is_visible: {
      type: Boolean,
      default: true
    },
    is_collapsible: {
      type: Boolean,
      default: true
    }
  }],
  theme: {
    primary_color: {
      type: String,
      default: '#3B82F6'
    },
    secondary_color: {
      type: String,
      default: '#6B7280'
    },
    background_color: {
      type: String,
      default: '#F9FAFB'
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for widget count
dashboardSchema.virtual('widget_count').get(function() {
  return this.widgets.length;
});

// Static method to get dashboard by role
dashboardSchema.statics.findByRole = function(role) {
  return this.findOne({ role: role.toLowerCase(), is_active: true });
};

// Static method to get dashboard widgets by role
dashboardSchema.statics.getWidgetsByRole = function(role) {
  return this.findOne({ role: role.toLowerCase(), is_active: true })
    .select('widgets');
};

// Static method to create default dashboards
dashboardSchema.statics.createDefaultDashboards = async function() {
  const defaultDashboards = [
    {
      name: 'SuperAdmin Dashboard',
      role: 'superadmin',
      layout: 'grid',
      widgets: [
        {
          widget_id: 'superadmin_overview',
          widget_type: 'metric',
          title: 'System Overview',
          position: { x: 0, y: 0, width: 3, height: 2 },
          permissions: ['view_system_metrics', 'view_audit_logs', 'view_system_alerts'],
          data_source: 'system_metrics',
          refresh_interval: 30000
        },
        {
          widget_id: 'global_attendance',
          widget_type: 'chart',
          title: 'Global Attendance',
          position: { x: 3, y: 0, width: 3, height: 2 },
          permissions: ['view_attendance_chart', 'view_attendance_trends'],
          data_source: 'attendance',
          refresh_interval: 300000
        },
        {
          widget_id: 'global_employees',
          widget_type: 'chart',
          title: 'Global Employees',
          position: { x: 6, y: 0, width: 3, height: 2 },
          permissions: ['view_employee_chart', 'view_employee_trends'],
          data_source: 'employees',
          refresh_interval: 300000
        },
        {
          widget_id: 'global_assets',
          widget_type: 'chart',
          title: 'Global Assets',
          position: { x: 9, y: 0, width: 3, height: 2 },
          permissions: ['view_asset_chart', 'view_asset_trends'],
          data_source: 'assets',
          refresh_interval: 300000
        },
        {
          widget_id: 'system_alerts',
          widget_type: 'list',
          title: 'System Alerts',
          position: { x: 0, y: 2, width: 6, height: 3 },
          permissions: ['view_system_alerts', 'view_audit_logs'],
          data_source: 'audit_logs',
          refresh_interval: 30000
        },
        {
          widget_id: 'global_transfers',
          widget_type: 'list',
          title: 'Global Transfers',
          position: { x: 6, y: 2, width: 6, height: 3 },
          permissions: ['view_transfer_requests', 'view_pending_approvals'],
          data_source: 'transfers',
          refresh_interval: 60000
        },
        {
          widget_id: 'compliance_status',
          widget_type: 'gauge',
          title: 'Compliance Status',
          position: { x: 0, y: 5, width: 4, height: 2 },
          permissions: ['view_compliance_status'],
          data_source: 'compliance',
          refresh_interval: 300000
        },
        {
          widget_id: 'system_metrics',
          widget_type: 'table',
          title: 'System Metrics',
          position: { x: 4, y: 5, width: 8, height: 2 },
          permissions: ['view_system_metrics'],
          data_source: 'system_metrics',
          refresh_interval: 60000
        }
      ]
    },
    {
      name: 'Admin Dashboard',
      role: 'admin',
      layout: 'grid',
      widgets: [
        {
          widget_id: 'admin_overview',
          widget_type: 'metric',
          title: 'System Overview',
          position: { x: 0, y: 0, width: 4, height: 2 },
          permissions: ['view_system_metrics', 'view_audit_logs'],
          data_source: 'system_metrics',
          refresh_interval: 60000
        },
        {
          widget_id: 'attendance_chart',
          widget_type: 'chart',
          title: 'Attendance Trends',
          position: { x: 4, y: 0, width: 4, height: 2 },
          permissions: ['view_attendance_chart', 'view_attendance_trends'],
          data_source: 'attendance',
          refresh_interval: 300000
        },
        {
          widget_id: 'employee_chart',
          widget_type: 'chart',
          title: 'Employee Distribution',
          position: { x: 8, y: 0, width: 4, height: 2 },
          permissions: ['view_employee_chart', 'view_employee_trends'],
          data_source: 'employees',
          refresh_interval: 300000
        },
        {
          widget_id: 'asset_summary',
          widget_type: 'table',
          title: 'Asset Summary',
          position: { x: 0, y: 2, width: 6, height: 3 },
          permissions: ['view_asset_summary', 'view_asset_chart'],
          data_source: 'assets',
          refresh_interval: 300000
        },
        {
          widget_id: 'transfer_requests',
          widget_type: 'list',
          title: 'Pending Transfers',
          position: { x: 6, y: 2, width: 6, height: 3 },
          permissions: ['view_transfer_requests', 'view_pending_approvals'],
          data_source: 'transfers',
          refresh_interval: 60000
        },
        {
          widget_id: 'recent_activities',
          widget_type: 'list',
          title: 'Recent Activities',
          position: { x: 0, y: 5, width: 12, height: 2 },
          permissions: ['view_recent_activities', 'view_audit_logs'],
          data_source: 'audit_logs',
          refresh_interval: 30000
        }
      ]
    },
    {
      name: 'HR Dashboard',
      role: 'hr',
      layout: 'sidebar',
      widgets: [
        {
          widget_id: 'hr_overview',
          widget_type: 'metric',
          title: 'HR Overview',
          position: { x: 0, y: 0, width: 3, height: 2 },
          permissions: ['view_employee_count', 'view_attendance_summary'],
          data_source: 'employees',
          refresh_interval: 300000
        },
        {
          widget_id: 'attendance_summary',
          widget_type: 'chart',
          title: 'Attendance Summary',
          position: { x: 3, y: 0, width: 6, height: 2 },
          permissions: ['view_attendance_chart', 'view_attendance_summary'],
          data_source: 'attendance',
          refresh_interval: 300000
        },
        {
          widget_id: 'employee_list',
          widget_type: 'table',
          title: 'Employee List',
          position: { x: 0, y: 2, width: 9, height: 4 },
          permissions: ['view_employee_count'],
          data_source: 'employees',
          refresh_interval: 300000
        },
        {
          widget_id: 'pending_approvals',
          widget_type: 'list',
          title: 'Pending Approvals',
          position: { x: 9, y: 2, width: 3, height: 4 },
          permissions: ['view_pending_approvals', 'view_transfer_requests'],
          data_source: 'transfers',
          refresh_interval: 60000
        }
      ]
    },
    {
      name: 'Manager Dashboard',
      role: 'manager',
      layout: 'cards',
      widgets: [
        {
          widget_id: 'team_overview',
          widget_type: 'metric',
          title: 'Team Overview',
          position: { x: 0, y: 0, width: 4, height: 2 },
          permissions: ['view_employee_count', 'view_attendance_summary'],
          data_source: 'employees',
          refresh_interval: 300000
        },
        {
          widget_id: 'team_attendance',
          widget_type: 'chart',
          title: 'Team Attendance',
          position: { x: 4, y: 0, width: 4, height: 2 },
          permissions: ['view_attendance_chart', 'view_attendance_summary'],
          data_source: 'attendance',
          refresh_interval: 300000
        },
        {
          widget_id: 'team_assets',
          widget_type: 'table',
          title: 'Team Assets',
          position: { x: 8, y: 0, width: 4, height: 2 },
          permissions: ['view_asset_summary'],
          data_source: 'assets',
          refresh_interval: 300000
        },
        {
          widget_id: 'team_transfers',
          widget_type: 'list',
          title: 'Team Transfers',
          position: { x: 0, y: 2, width: 12, height: 3 },
          permissions: ['view_transfer_requests'],
          data_source: 'transfers',
          refresh_interval: 300000
        }
      ]
    },
    {
      name: 'Employee Dashboard',
      role: 'employee',
      layout: 'tabs',
      widgets: [
        {
          widget_id: 'personal_info',
          widget_type: 'metric',
          title: 'Personal Info',
          position: { x: 0, y: 0, width: 6, height: 2 },
          permissions: ['view_attendance_summary'],
          data_source: 'employees',
          refresh_interval: 300000
        },
        {
          widget_id: 'my_attendance',
          widget_type: 'chart',
          title: 'My Attendance',
          position: { x: 6, y: 0, width: 6, height: 2 },
          permissions: ['view_attendance_chart'],
          data_source: 'attendance',
          refresh_interval: 300000
        },
        {
          widget_id: 'my_assets',
          widget_type: 'list',
          title: 'My Assets',
          position: { x: 0, y: 2, width: 6, height: 3 },
          permissions: ['view_asset_summary'],
          data_source: 'assets',
          refresh_interval: 300000
        },
        {
          widget_id: 'my_documents',
          widget_type: 'list',
          title: 'My Documents',
          position: { x: 6, y: 2, width: 6, height: 3 },
          permissions: ['view_document_status'],
          data_source: 'documents',
          refresh_interval: 300000
        }
      ]
    }
  ];

  for (const dashboardData of defaultDashboards) {
    const existingDashboard = await this.findOne({ role: dashboardData.role });
    if (!existingDashboard) {
      await this.create(dashboardData);
    }
  }
};

module.exports = mongoose.model('Dashboard', dashboardSchema);
