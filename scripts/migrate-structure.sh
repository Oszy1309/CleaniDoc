#!/bin/bash

# CleaniDoc Dashboard - Project Structure Migration Script
# This script migrates the current React app to a more organized structure

set -e

echo "🚀 Starting CleaniDoc Dashboard structure migration..."

# Create backup
echo "📦 Creating backup..."
cp -r src src_backup_$(date +%Y%m%d_%H%M%S)

# Create new directory structure
echo "📁 Creating new directory structure..."

# Main directories
mkdir -p src/pages/dashboard
mkdir -p src/pages/auth
mkdir -p src/pages/public

# Component directories
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/forms
mkdir -p src/components/features

# Library directories
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/utils

# Keep existing styles directory
# src/styles already exists

echo "✅ New directory structure created!"

# Move pages to appropriate directories
echo "📄 Organizing pages..."

# Dashboard pages
mv src/pages/Dashboard.js src/pages/dashboard/
mv src/pages/Dashboard.css src/pages/dashboard/
mv src/pages/Customers.js src/pages/dashboard/
mv src/pages/Customers.css src/pages/dashboard/
mv src/pages/CleaningPlans.js src/pages/dashboard/
mv src/pages/CleaningPlans.css src/pages/dashboard/
mv src/pages/Protocols.js src/pages/dashboard/
mv src/pages/Protocols.css src/pages/dashboard/
mv src/pages/CustomerDetail.js src/pages/dashboard/
mv src/pages/CustomerDetail.css src/pages/dashboard/
mv src/pages/CleaningLogsPage.js src/pages/dashboard/
mv src/pages/CleaningLogsPage.css src/pages/dashboard/
mv src/pages/WorkersPage.js src/pages/dashboard/
mv src/pages/WorkersPage.css src/pages/dashboard/
mv src/pages/WorkerDashboard.js src/pages/dashboard/
mv src/pages/WorkerDashboard.css src/pages/dashboard/
mv src/pages/CustomerDashboard.js src/pages/dashboard/
mv src/pages/CustomerDashboard.css src/pages/dashboard/

# Auth pages
mv src/pages/Login.js src/pages/auth/
mv src/pages/Login.css src/pages/auth/
mv src/pages/WorkerLogin.js src/pages/auth/
mv src/pages/WorkerLogin.css src/pages/auth/
mv src/pages/CustomerLogin.js src/pages/auth/
mv src/pages/CustomerLogin.css src/pages/auth/

# Move remaining files if they exist
if [ -f src/pages/DailyReportPage.css ]; then
    mv src/pages/DailyReportPage.css src/pages/dashboard/
fi

echo "✅ Pages organized!"

# Move components to appropriate directories
echo "🧩 Organizing components..."

# Layout components
mv src/components/ProfessionalHeader.js src/components/layout/
mv src/components/ProfessionalHeader.css src/components/layout/
mv src/components/Header.js src/components/layout/
mv src/components/Header.css src/components/layout/
mv src/components/Sidebar.js src/components/layout/
mv src/components/Sidebar.css src/components/layout/
mv src/components/ModernSidebar.js src/components/layout/
mv src/components/ModernSidebar.css src/components/layout/

# Form/Modal components
mv src/components/WorkerModal.js src/components/forms/
mv src/components/WorkerModal.css src/components/forms/
mv src/components/BereichModal.js src/components/forms/
mv src/components/BereichModal.css src/components/forms/
mv src/components/PlanModal.js src/components/forms/
mv src/components/PlanModal.css src/components/forms/
mv src/components/CleaningPlanModal.js src/components/forms/
mv src/components/CleaningPlanModal.css src/components/forms/
mv src/components/PlanSignatureModal.js src/components/forms/
mv src/components/PlanSignatureModal.css src/components/forms/
mv src/components/PasswordReset.js src/components/forms/
mv src/components/PasswordReset.css src/components/forms/

# Feature-specific components
mv src/components/CleaningPlanDetail.js src/components/features/
mv src/components/CleaningPlanDetail.css src/components/features/
mv src/components/LogDetailView.js src/components/features/
mv src/components/LogDetailView.css src/components/features/
mv src/components/LogListView.js src/components/features/
mv src/components/LogListView.css src/components/features/
mv src/components/WorkerLogDetail.js src/components/features/
mv src/components/WorkerLogDetail.css src/components/features/
mv src/components/PlansTab.js src/components/features/
mv src/components/PlansTab.css src/components/features/
mv src/components/DailyReportViewProfessional.js src/components/features/
mv src/components/DailyReportViewProfessional.css src/components/features/
mv src/components/DailyReportViewProfessional.jsx src/components/features/
mv src/components/EnhancedWorkerComponents.js src/components/features/
mv src/components/EnhancedWorkerComponents.css src/components/features/

# UI components
mv src/components/SignatureCanvas.js src/components/ui/
mv src/components/SignatureCanvas.css src/components/ui/

# Move remaining CSS file to styles
if [ -f src/components/CONTRAST_FIXES.css ]; then
    mv src/components/CONTRAST_FIXES.css src/styles/
fi

echo "✅ Components organized!"

# Move utilities
echo "🔧 Organizing utilities..."
mv src/utils/pdfUtils.js src/lib/

echo "✅ Utilities organized!"

# Remove empty original pages directory
if [ -d src/pages ] && [ -z "$(ls -A src/pages)" ]; then
    rmdir src/pages
fi

# Remove empty original components directory
if [ -d src/components ] && [ -z "$(ls -A src/components)" ]; then
    rmdir src/components
fi

echo "🎉 Structure migration completed!"
echo "📋 Next steps:"
echo "   1. Run the import path update script"
echo "   2. Create lib files (supabase.js, auth.js, etc.)"
echo "   3. Test the application"
echo ""
echo "💾 Backup created at: src_backup_$(date +%Y%m%d_%H%M%S)"