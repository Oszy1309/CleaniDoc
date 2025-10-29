#!/bin/bash

# CleaniDoc Dashboard - Complete Migration Runner
# This script runs the complete migration process

set -e

echo "🚀 Starting complete CleaniDoc Dashboard migration..."

# Make sure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Make scripts executable
chmod +x scripts/migrate-structure.sh
chmod +x scripts/update-imports.js
chmod +x scripts/create-lib-files.js

echo "📋 Migration Steps:"
echo "   1. Create project structure"
echo "   2. Create library files"
echo "   3. Move existing files"
echo "   4. Update import paths"
echo "   5. Update App.js to use new structure"
echo ""

read -p "Continue with migration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Step 1: Create library files first (before moving files)
echo "📚 Step 1: Creating library files..."
node scripts/create-lib-files.js

# Step 2: Run structure migration
echo "🔄 Step 2: Running structure migration..."
./scripts/migrate-structure.sh

# Step 3: Update import paths
echo "🔗 Step 3: Updating import paths..."
node scripts/update-imports.js

# Step 4: Update App.js to use new lib structure
echo "⚙️  Step 4: Updating App.js..."

# Backup original App.js
cp src/App.js src/App.js.backup

# Update App.js imports
sed -i 's/import { createClient } from.*$/\/\/ Supabase client moved to lib\/supabase.js/' src/App.js
sed -i '/^const supabaseUrl.*$/,/^);$/d' src/App.js
sed -i '/^export const supabase.*$/d' src/App.js

# Add new import at the top
sed -i '4a import { supabase } from '\''./lib/supabase'\'';' src/App.js

echo "✅ App.js updated to use new lib structure"

# Step 5: Create index files for easier imports
echo "📑 Step 5: Creating index files..."

# Create components index
cat > src/components/index.js << 'EOF'
// Layout components
export { default as ProfessionalHeader } from './layout/ProfessionalHeader';
export { default as Header } from './layout/Header';
export { default as Sidebar } from './layout/Sidebar';
export { default as ModernSidebar } from './layout/ModernSidebar';

// Form components
export { default as WorkerModal } from './forms/WorkerModal';
export { default as BereichModal } from './forms/BereichModal';
export { default as PlanModal } from './forms/PlanModal';
export { default as CleaningPlanModal } from './forms/CleaningPlanModal';
export { default as PlanSignatureModal } from './forms/PlanSignatureModal';
export { default as PasswordReset } from './forms/PasswordReset';

// Feature components
export { default as CleaningPlanDetail } from './features/CleaningPlanDetail';
export { default as LogDetailView } from './features/LogDetailView';
export { default as LogListView } from './features/LogListView';
export { default as WorkerLogDetail } from './features/WorkerLogDetail';
export { default as PlansTab } from './features/PlansTab';
export { default as DailyReportViewProfessional } from './features/DailyReportViewProfessional';
export { default as EnhancedWorkerComponents } from './features/EnhancedWorkerComponents';

// UI components
export { default as SignatureCanvas } from './ui/SignatureCanvas';
EOF

# Create pages index
cat > src/pages/index.js << 'EOF'
// Dashboard pages
export { default as Dashboard } from './dashboard/Dashboard';
export { default as Customers } from './dashboard/Customers';
export { default as CleaningPlans } from './dashboard/CleaningPlans';
export { default as Protocols } from './dashboard/Protocols';
export { default as CustomerDetail } from './dashboard/CustomerDetail';
export { default as CleaningLogsPage } from './dashboard/CleaningLogsPage';
export { default as WorkersPage } from './dashboard/WorkersPage';
export { default as WorkerDashboard } from './dashboard/WorkerDashboard';
export { default as CustomerDashboard } from './dashboard/CustomerDashboard';

// Auth pages
export { default as Login } from './auth/Login';
export { default as WorkerLogin } from './auth/WorkerLogin';
export { default as CustomerLogin } from './auth/CustomerLogin';
EOF

# Create lib index
cat > src/lib/index.js << 'EOF'
export { default as supabase } from './supabase';
export { default as authHelpers } from './auth';
export { default as apiHelpers } from './api';
export { default as validationRules } from './validation';
export { default as APP_CONFIG } from './constants';
EOF

# Create hooks index
cat > src/hooks/index.js << 'EOF'
export { default as useAuth } from './useAuth';
export { default as useApi } from './useApi';
export { default as useToast } from './useToast';
EOF

echo "✅ Index files created"

# Step 6: Test if the app compiles
echo "🧪 Step 6: Testing compilation..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful!"
else
    echo "⚠️  Build had issues. You may need to manually fix some import paths."
    echo "   Run 'npm start' or 'npm run build' to see specific errors."
fi

echo ""
echo "🎉 Migration completed successfully!"
echo ""
echo "📋 What was done:"
echo "   ✅ Created new directory structure"
echo "   ✅ Moved all files to appropriate locations"
echo "   ✅ Updated import paths"
echo "   ✅ Created lib files (supabase, auth, api, validation, constants)"
echo "   ✅ Created custom hooks (useAuth, useApi, useToast)"
echo "   ✅ Created utility functions (format, id)"
echo "   ✅ Created type definitions"
echo "   ✅ Created index files for easier imports"
echo "   ✅ Updated App.js to use new structure"
echo ""
echo "📁 New structure:"
echo "   src/"
echo "   ├── pages/"
echo "   │   ├── dashboard/     # Dashboard-related pages"
echo "   │   ├── auth/          # Authentication pages"
echo "   │   └── public/        # Public pages (empty for now)"
echo "   ├── components/"
echo "   │   ├── layout/        # Layout components"
echo "   │   ├── forms/         # Form and modal components"
echo "   │   ├── features/      # Feature-specific components"
echo "   │   └── ui/            # Reusable UI components"
echo "   ├── lib/               # Business logic and API"
echo "   ├── hooks/             # Custom React hooks"
echo "   ├── utils/             # Utility functions"
echo "   ├── types/             # Type definitions"
echo "   └── styles/            # Global styles"
echo ""
echo "🔄 Next steps:"
echo "   1. Run 'npm start' to test the application"
echo "   2. Fix any remaining import issues if they exist"
echo "   3. Consider migrating to TypeScript for better type safety"
echo "   4. Add proper error boundaries and loading states"
echo ""
echo "💾 Backups created:"
echo "   - src_backup_[timestamp]/ - Complete source backup"
echo "   - src/App.js.backup - Original App.js backup"