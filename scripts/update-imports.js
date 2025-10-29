#!/usr/bin/env node

// CleaniDoc Dashboard - Import Path Update Script
// This script updates all import paths after the structure migration

const fs = require('fs');
const path = require('path');

// Import mapping for the new structure
const importMappings = {
  // Pages mappings
  './pages/Dashboard': './pages/dashboard/Dashboard',
  './pages/Customers': './pages/dashboard/Customers',
  './pages/CleaningPlans': './pages/dashboard/CleaningPlans',
  './pages/Protocols': './pages/dashboard/Protocols',
  './pages/CustomerDetail': './pages/dashboard/CustomerDetail',
  './pages/CleaningLogsPage': './pages/dashboard/CleaningLogsPage',
  './pages/WorkersPage': './pages/dashboard/WorkersPage',
  './pages/WorkerDashboard': './pages/dashboard/WorkerDashboard',
  './pages/CustomerDashboard': './pages/dashboard/CustomerDashboard',
  './pages/Login': './pages/auth/Login',
  './pages/WorkerLogin': './pages/auth/WorkerLogin',
  './pages/CustomerLogin': './pages/auth/CustomerLogin',

  // Component mappings
  './components/ProfessionalHeader': './components/layout/ProfessionalHeader',
  './components/Header': './components/layout/Header',
  './components/Sidebar': './components/layout/Sidebar',
  './components/ModernSidebar': './components/layout/ModernSidebar',

  './components/WorkerModal': './components/forms/WorkerModal',
  './components/BereichModal': './components/forms/BereichModal',
  './components/PlanModal': './components/forms/PlanModal',
  './components/CleaningPlanModal': './components/forms/CleaningPlanModal',
  './components/PlanSignatureModal': './components/forms/PlanSignatureModal',
  './components/PasswordReset': './components/forms/PasswordReset',

  './components/CleaningPlanDetail': './components/features/CleaningPlanDetail',
  './components/LogDetailView': './components/features/LogDetailView',
  './components/LogListView': './components/features/LogListView',
  './components/WorkerLogDetail': './components/features/WorkerLogDetail',
  './components/PlansTab': './components/features/PlansTab',
  './components/DailyReportViewProfessional': './components/features/DailyReportViewProfessional',
  './components/EnhancedWorkerComponents': './components/features/EnhancedWorkerComponents',

  './components/SignatureCanvas': './components/ui/SignatureCanvas',

  // CSS mappings
  './components/ProfessionalHeader.css': './components/layout/ProfessionalHeader.css',
  './components/ModernSidebar.css': './components/layout/ModernSidebar.css',
  './components/CONTRAST_FIXES.css': './styles/CONTRAST_FIXES.css',

  // Utils mappings
  './utils/pdfUtils': './lib/pdfUtils',
  '../utils/pdfUtils': '../lib/pdfUtils',
};

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Update imports
    for (const [oldPath, newPath] of Object.entries(importMappings)) {
      const oldImportRegex = new RegExp(`(['"])(${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(['"])`, 'g');
      if (oldImportRegex.test(content)) {
        content = content.replace(oldImportRegex, `$1${newPath}$3`);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated imports in: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function findJSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findJSFiles(fullPath, files);
    } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  console.log('🔄 Starting import path updates...');

  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found!');
    process.exit(1);
  }

  const jsFiles = findJSFiles(srcDir);
  let updatedCount = 0;

  for (const file of jsFiles) {
    if (updateImportsInFile(file)) {
      updatedCount++;
    }
  }

  console.log(`\\n🎉 Import update completed!`);
  console.log(`📊 Updated ${updatedCount} files out of ${jsFiles.length} total JS files`);
}

if (require.main === module) {
  main();
}

module.exports = { updateImportsInFile, importMappings };