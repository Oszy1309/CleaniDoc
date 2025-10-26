import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generiert PDF aus HTML-Element
 */
export const generatePDFFromElement = async (element, filename) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Fehler beim PDF-Download:', error);
    throw error;
  }
};

/**
 * Generiert Cleaning-Log PDF (Protokoll)
 */
export const generateCleaningLogPDF = (logData, filename) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // ===== HEADER =====
  const startY = yPosition;

  // Left side - Title
  pdf.setFontSize(24);
  pdf.setTextColor(30, 64, 175); // Navy
  pdf.text('Reinigungsprotokoll', margin, yPosition);

  // Right side - Customer info
  pdf.setFontSize(12);
  pdf.setTextColor(30, 64, 175);
  const customerText = logData.customerName || 'Kunde unbekannt';
  const customerWidth = pdf.getTextWidth(customerText);
  const customerHeaderX = pageWidth - margin - customerWidth;
  pdf.text(customerText, customerHeaderX, yPosition);

  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  const areaText = logData.areaName || 'Bereich unbekannt';
  const areaWidth = pdf.getTextWidth(areaText);
  const areaHeaderX = pageWidth - margin - areaWidth;
  pdf.text(areaText, areaHeaderX, yPosition);

  // Left side - Date
  yPosition = startY + 15;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, margin, yPosition);

  yPosition += 15;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 10;

  // ===== CUSTOMER INFO =====
  pdf.setFontSize(14);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Kundeninformation', margin, yPosition);

  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  const customerInfo = [
    { label: 'Kunde:', value: logData.customerName },
    { label: 'Bereich:', value: logData.areaName },
    { label: 'Termin:', value: logData.scheduledDate },
    { label: 'Status:', value: logData.status },
  ];

  customerInfo.forEach((info) => {
    pdf.setFont(undefined, 'bold');
    pdf.text(info.label, margin, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(info.value, margin + 40, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // ===== PLAN INFO =====
  pdf.setFontSize(14);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Reinigungsplan', margin, yPosition);

  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  pdf.setFont(undefined, 'bold');
  pdf.text('Plan:', margin, yPosition);
  pdf.setFont(undefined, 'normal');
  pdf.text(logData.planName, margin + 40, yPosition);

  yPosition += 7;

  if (logData.planDescription) {
    pdf.setFont(undefined, 'bold');
    pdf.text('Beschreibung:', margin, yPosition);
    yPosition += 7;
    pdf.setFont(undefined, 'normal');

    const splitDescription = pdf.splitTextToSize(
      logData.planDescription,
      contentWidth - 30
    );
    splitDescription.forEach((line) => {
      pdf.text(line, margin + 10, yPosition);
      yPosition += 5;
    });
  }

  yPosition += 10;

  // ===== STEPS TABLE =====
  pdf.setFontSize(14);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Reinigungsschritte', margin, yPosition);

  yPosition += 10;

  // Table headers
  const tableStartY = yPosition;
  const colWidths = {
    step: 40,
    agent: 35,
    time: 20,
    status: 20,
    notes: contentWidth - 115
  };

  let currentX = margin;

  // Header row
  pdf.setFontSize(7);
  pdf.setFont(undefined, 'bold');
  pdf.setTextColor(30, 64, 175);

  // Draw header background
  pdf.setFillColor(240, 248, 255);
  pdf.rect(margin, yPosition - 1, contentWidth, 6, 'F');

  // Header text
  pdf.text('Schritt', currentX + 2, yPosition + 3);
  currentX += colWidths.step;
  pdf.text('Mittel', currentX + 2, yPosition + 3);
  currentX += colWidths.agent;
  pdf.text('Einwirkzeit', currentX + 2, yPosition + 3);
  currentX += colWidths.time;
  pdf.text('Status', currentX + 2, yPosition + 3);
  currentX += colWidths.status;
  pdf.text('Notizen', currentX + 2, yPosition + 3);

  yPosition += 8;

  // Table content
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(6);

  logData.steps.forEach((step, index) => {
    // Check if we need a new page (reserve 60mm for signature)
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = margin;
    }

    currentX = margin;
    const rowHeight = 6;

    // Row background (alternating)
    if (index % 2 === 0) {
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, yPosition - 1, contentWidth, rowHeight, 'F');
    }

    pdf.setTextColor(0, 0, 0);

    // Step name (truncated if too long)
    const stepName = step.step_name.length > 25 ? step.step_name.substring(0, 22) + '...' : step.step_name;
    pdf.text(stepName, currentX + 2, yPosition + 3);
    currentX += colWidths.step;

    // Agent
    const agent = step.cleaning_agent && step.cleaning_agent !== 'none' ? step.cleaning_agent : '-';
    const agentText = agent.length > 20 ? agent.substring(0, 17) + '...' : agent;
    pdf.text(agentText, currentX + 2, yPosition + 3);
    currentX += colWidths.agent;

    // Time
    const timeText = step.dwell_time_minutes > 0 ? `${step.dwell_time_minutes}min` : '-';
    pdf.text(timeText, currentX + 2, yPosition + 3);
    currentX += colWidths.time;

    // Status
    if (step.completed) {
      pdf.setTextColor(0, 150, 0);
    } else {
      pdf.setTextColor(150, 150, 150);
    }
    pdf.text(step.completed ? '✓' : '○', currentX + 2, yPosition + 3);
    pdf.setTextColor(0, 0, 0);
    currentX += colWidths.status;

    // Notes (truncated if too long)
    if (step.worker_notes && step.worker_notes.trim()) {
      const notes = step.worker_notes.length > 40 ? step.worker_notes.substring(0, 37) + '...' : step.worker_notes;
      pdf.text(notes, currentX + 2, yPosition + 3);
    }

    yPosition += rowHeight;
  });

  // Table border
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, tableStartY - 1, contentWidth, yPosition - tableStartY + 1);

  // Column separators
  currentX = margin + colWidths.step;
  pdf.line(currentX, tableStartY - 1, currentX, yPosition);
  currentX += colWidths.agent;
  pdf.line(currentX, tableStartY - 1, currentX, yPosition);
  currentX += colWidths.time;
  pdf.line(currentX, tableStartY - 1, currentX, yPosition);
  currentX += colWidths.status;
  pdf.line(currentX, tableStartY - 1, currentX, yPosition);

  yPosition += 5;

  // ===== SIGNATURE =====
  if (logData.signature) {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(30, 64, 175);
    pdf.text('Unterschrift', margin, yPosition);

    yPosition += 15;

    // Add signature image
    try {
      pdf.addImage(logData.signature, 'PNG', margin, yPosition, 80, 40);
      yPosition += 45;
    } catch (error) {
      console.warn('Fehler beim Hinzufügen der Unterschrift:', error);
    }

    if (logData.completedAt) {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Unterschrieben am: ${new Date(logData.completedAt).toLocaleDateString('de-DE')}`,
        margin,
        yPosition
      );
    }
  }

  // ===== FOOTER =====
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `CleaniDoc - Cleaning Management System | Seite 1 von ${pdf.getNumberOfPages()}`,
    margin,
    pageHeight - 10
  );

  return pdf;
};

/**
 * Generiert Plan PDF (für Genehmigung/Unterschrift)
 */
export const generatePlanPDF = (planData, filename) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // ===== HEADER =====
  pdf.setFontSize(24);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Reinigungsplan', margin, yPosition);

  yPosition += 12;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')}`, margin, yPosition);

  yPosition += 12;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // ===== CUSTOMER & AREA =====
  pdf.setFontSize(14);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Plan Information', margin, yPosition);

  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  const infoFields = [
    { label: 'Kunde:', value: planData.customerName },
    { label: 'Bereich:', value: planData.areaName },
    { label: 'Plan Name:', value: planData.name },
    { label: 'Häufigkeit:', value: planData.frequency },
    { label: 'Status:', value: planData.signature_status },
  ];

  infoFields.forEach((field) => {
    pdf.setFont(undefined, 'bold');
    pdf.text(field.label, margin, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(field.value, margin + 50, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // ===== DESCRIPTION =====
  if (planData.description) {
    pdf.setFontSize(12);
    pdf.setTextColor(30, 64, 175);
    pdf.text('Beschreibung', margin, yPosition);

    yPosition += 7;
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);

    const splitDesc = pdf.splitTextToSize(planData.description, contentWidth - 10);
    splitDesc.forEach((line) => {
      pdf.text(line, margin + 5, yPosition);
      yPosition += 6;
    });

    yPosition += 8;
  }

  // ===== STEPS TABLE =====
  pdf.setFontSize(12);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Reinigungsschritte', margin, yPosition);

  yPosition += 10;
  pdf.setFontSize(9);

  planData.steps.forEach((step, index) => {
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text(`${index + 1}. ${step.step_name}`, margin, yPosition);
    yPosition += 6;

    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(80, 80, 80);

    if (step.equipment && step.equipment.length > 0) {
      const equipStr = step.equipment.join(', ');
      pdf.text(`Geräte: ${equipStr}`, margin + 5, yPosition);
      yPosition += 5;
    }

    if (step.cleaning_agent && step.cleaning_agent !== 'none') {
      pdf.text(`Mittel: ${step.cleaning_agent}`, margin + 5, yPosition);
      yPosition += 5;
    }

    if (step.dwell_time_minutes > 0) {
      pdf.text(`Einwirkzeit: ${step.dwell_time_minutes} Minuten`, margin + 5, yPosition);
      yPosition += 5;
    }

    yPosition += 5;

    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = margin;
    }
  });

  yPosition += 10;

  // ===== SIGNATURES SECTION =====
  pdf.addPage();
  yPosition = margin;

  pdf.setFontSize(14);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Unterschriften', margin, yPosition);

  yPosition += 15;

  // Admin Signature
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Administrator Genehmigung:', margin, yPosition);

  yPosition += 8;
  pdf.setDrawColor(100, 100, 100);
  pdf.line(margin, yPosition, margin + 70, yPosition);

  yPosition += 10;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);

  if (planData.admin_signed_at) {
    pdf.text(`Unterzeichnet: ${new Date(planData.admin_signed_at).toLocaleDateString('de-DE')}`, margin, yPosition);
    if (planData.admin_signature) {
      try {
        pdf.addImage(planData.admin_signature, 'PNG', margin, yPosition + 5, 60, 30);
        yPosition += 35;
      } catch (error) {
        console.warn('Admin Signature Image Error:', error);
      }
    }
  } else {
    pdf.text('(Ausstehend)', margin, yPosition);
  }

  yPosition += 20;

  // Customer Signature
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Kundenbestätigung:', margin, yPosition);

  yPosition += 8;
  pdf.setDrawColor(100, 100, 100);
  pdf.line(margin, yPosition, margin + 70, yPosition);

  yPosition += 10;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);

  if (planData.customer_signed_at) {
    pdf.text(`Unterzeichnet: ${new Date(planData.customer_signed_at).toLocaleDateString('de-DE')}`, margin, yPosition);
    if (planData.customer_signature) {
      try {
        pdf.addImage(planData.customer_signature, 'PNG', margin, yPosition + 5, 60, 30);
        yPosition += 35;
      } catch (error) {
        console.warn('Customer Signature Image Error:', error);
      }
    }
  } else {
    pdf.text('(Ausstehend)', margin, yPosition);
  }

  // ===== FOOTER =====
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `CleaniDoc - Cleaning Management System | ${new Date().toLocaleDateString('de-DE')}`,
    margin,
    pageHeight - 10
  );

  return pdf;
};

/**
 * Download helper
 */
export const downloadPDF = (pdf, filename) => {
  try {
    pdf.save(filename);
  } catch (error) {
    console.error('Fehler beim PDF-Download:', error);
    throw error;
  }
};
