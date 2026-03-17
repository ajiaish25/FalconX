import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { useState, useEffect } from 'react';

// Export entire page as PDF (captures full page with html2canvas)
export const exportPageAsPDF = async (
  element: HTMLElement | null, 
  filename: string = 'work-buddy-page.pdf',
  options: {
    scale?: number;
    backgroundColor?: string;
    includeScrollableContent?: boolean;
  } = {}
) => {
  if (!element) {
    throw new Error('Element not found for PDF export');
  }

  const {
    scale = 2,
    backgroundColor = '#ffffff',
    includeScrollableContent = true
  } = options;

  // Temporarily adjust styles for better PDF capture
  const originalStyles = {
    width: element.style.width,
    backgroundColor: element.style.backgroundColor,
    overflow: element.style.overflow,
    height: element.style.height
  };

  // Set optimal styles for PDF capture
  element.style.backgroundColor = backgroundColor;
  element.style.overflow = 'visible';
  
  // If element has scrollable content, ensure we capture it all
  if (includeScrollableContent) {
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    if (scrollHeight > clientHeight) {
      element.style.height = `${scrollHeight}px`;
    }
  }

  try {
    // Create canvas from the entire element
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: backgroundColor,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add title page
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Work Buddy Export', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Exported on: ${new Date().toLocaleString()}`, pageWidth / 2, 27, { align: 'center' });

    // Add the image across multiple pages if needed
    let yPosition = 35; // Start below title
    let remainingHeight = imgHeight;
    let sourceY = 0; // Track source Y position in canvas

    while (remainingHeight > 0) {
      const availablePageHeight = pageHeight - yPosition - 10; // 10mm bottom margin
      const currentImgHeight = Math.min(remainingHeight, availablePageHeight);
      
      // Calculate how much of the canvas we need for this page
      const sourceHeight = (currentImgHeight / imgHeight) * canvas.height;
      
      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const pageCtx = pageCanvas.getContext('2d');
      
      if (pageCtx) {
        // Draw the slice from the main canvas
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png');
        pdf.addImage(
          pageImgData,
          'PNG',
          10,
          yPosition,
          imgWidth,
          currentImgHeight,
          undefined,
          'FAST'
        );
      }

      // Update positions for next iteration
      sourceY += sourceHeight;
      remainingHeight -= currentImgHeight;
      
      if (remainingHeight > 0) {
        pdf.addPage();
        yPosition = 10; // Start at top for subsequent pages
      }
    }

    pdf.save(filename);
  } finally {
    // Restore original styles
    element.style.width = originalStyles.width;
    element.style.backgroundColor = originalStyles.backgroundColor;
    element.style.overflow = originalStyles.overflow;
    element.style.height = originalStyles.height;
  }
};

// Export Work Buddy chat as PDF (messages only - legacy function)
export const exportChatAsPDF = async (messages: any[], filename: string = 'work-buddy-chat.pdf') => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;
  const lineHeight = 7;
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);

  // Add title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Work Buddy Chat Export', margin, yPosition);
  yPosition += 20;

  // Add timestamp
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Exported on: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 15;

  // Add messages
  messages.forEach((message, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = 20;
    }

    // Message header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const sender = message.sender === 'user' ? 'You' : 'Work Buddy';
    pdf.text(`${sender}:`, margin, yPosition);
    yPosition += lineHeight;

    // Message content
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Split long text into multiple lines
    const content = message.content || '';
    const lines = pdf.splitTextToSize(content, maxWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    // Add timestamp if available
    if (message.timestamp) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Time: ${new Date(message.timestamp).toLocaleString()}`, margin, yPosition);
      yPosition += lineHeight;
    }

    yPosition += 10; // Space between messages
  });

  // Save the PDF
  pdf.save(filename);
};

// Export Work Buddy chat as Excel
export const exportChatAsExcel = async (messages: any[], filename: string = 'work-buddy-chat.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Chat Export');

  // Add headers
  worksheet.columns = [
    { header: 'Message #', key: 'messageNumber', width: 10 },
    { header: 'Sender', key: 'sender', width: 15 },
    { header: 'Content', key: 'content', width: 80 },
    { header: 'Timestamp', key: 'timestamp', width: 20 },
    { header: 'Confidence', key: 'confidence', width: 12 },
    { header: 'Project Context', key: 'projectContext', width: 20 }
  ];

  // Add data rows
  messages.forEach((message, index) => {
    worksheet.addRow({
      messageNumber: index + 1,
      sender: message.sender === 'user' ? 'You' : 'Work Buddy',
      content: message.content || '',
      timestamp: message.timestamp ? new Date(message.timestamp).toLocaleString() : '',
      confidence: message.confidence || '',
      projectContext: message.projectContext || ''
    });
  });

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' }
  };

  // Save the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

// Export Insights dashboard as PDF
export const exportInsightsAsPDF = async (elementId: string, filename: string = 'insights-dashboard.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  // Create canvas from the element
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20; // 10mm margin on each side
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Add title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Insights Dashboard Export', 10, 15);
  
  // Add timestamp
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Exported on: ${new Date().toLocaleString()}`, 10, 22);

  // Add the image
  let yPosition = 30;
  let remainingHeight = imgHeight;

  while (remainingHeight > 0) {
    const currentPageHeight = pageHeight - yPosition - 10; // 10mm bottom margin
    const currentImgHeight = Math.min(remainingHeight, currentPageHeight);
    
    pdf.addImage(
      imgData,
      'PNG',
      10,
      yPosition,
      imgWidth,
      currentImgHeight,
      undefined,
      'FAST'
    );

    remainingHeight -= currentPageHeight;
    
    if (remainingHeight > 0) {
      pdf.addPage();
      yPosition = 10;
    }
  }

  pdf.save(filename);
};

// ---------- TCOE REPORT EXPORTS ----------

interface TcoeExportRow {
  portfolio: string;
  projectLabel: string;
  projectKey: string;
  metricName: string;
  bugs: number;
  defects: number;
  previousLabel: string;
  previousLeakage: number;
  currentLabel: string;
  currentLeakage: number;
  wowProgress: number;
  comments: string;
  bugKeys: string[];
  defectKeys: string[];
  bugsJql?: string;
  defectsJql?: string;
}

export const exportTcoeReportAsPDF = async (elementId: string, filename: string = 'tcoe-report.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  // Temporarily adjust styles for better PDF capture
  const originalStyles = {
    width: element.style.width,
    backgroundColor: element.style.backgroundColor,
    overflow: element.style.overflow,
    height: element.style.height,
    padding: element.style.padding
  };

  // Set optimal styles for PDF capture - ensure content is visible
  element.style.backgroundColor = '#ffffff';
  element.style.overflow = 'visible';
  element.style.width = '100%';
  element.style.padding = '0';

  try {
    // Capture the UI with higher quality settings
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality and readability
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      logging: false,
      removeContainer: false,
      imageTimeout: 20000, // Increased timeout
      onclone: (clonedDoc) => {
        // Ensure all content is visible and properly styled
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Force visibility of all cards and content
          const cards = clonedElement.querySelectorAll('[id^="tcoe-report-card-"]');
          cards.forEach((card: any) => {
            if (card) {
              card.style.display = 'block';
              card.style.visibility = 'visible';
              card.style.opacity = '1';
              card.style.transform = 'none';
            }
          });
          
          // Ensure all text elements are visible and readable
          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach((el: any) => {
            if (el.style) {
              const computedStyle = window.getComputedStyle(el);
              // Preserve original colors and ensure visibility
              if (computedStyle.color && computedStyle.color !== 'rgba(0, 0, 0, 0)') {
                el.style.color = computedStyle.color;
              }
              el.style.visibility = 'visible';
              el.style.opacity = '1';
              el.style.transform = 'none';
              
              // Ensure minimum font size for readability
              const fontSize = parseFloat(computedStyle.fontSize);
              if (fontSize && fontSize < 10) {
                el.style.fontSize = '10px';
              }
            }
          });
          
          // Ensure tables are properly displayed with full width
          const tables = clonedElement.querySelectorAll('table');
          tables.forEach((table: any) => {
            if (table.style) {
              table.style.display = 'table';
              table.style.visibility = 'visible';
              table.style.width = '100%';
              table.style.borderCollapse = 'collapse';
            }
            
            // Ensure table cells are visible
            const cells = table.querySelectorAll('td, th');
            cells.forEach((cell: any) => {
              if (cell.style) {
                cell.style.visibility = 'visible';
                cell.style.opacity = '1';
              }
            });
          });
          
          // Ensure all divs and containers are visible
          const containers = clonedElement.querySelectorAll('div, section, article');
          containers.forEach((container: any) => {
            if (container.style) {
              const display = window.getComputedStyle(container).display;
              if (display === 'none') {
                container.style.display = 'block';
              }
              container.style.visibility = 'visible';
              container.style.opacity = '1';
            }
          });
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');

    // Use landscape orientation so the wide table is readable
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate optimal image dimensions to fill full page
    const margin = 5; // Minimal margins to maximize content area
    const headerHeight = 25; // Header height for first page
    const footerHeight = 10; // Footer height for first page
    
    // Calculate available space (in mm) - maximize usage
    const availableWidth = pageWidth - (margin * 2);
    const availableHeightFirstPage = pageHeight - headerHeight - footerHeight - margin;
    const availableHeightOtherPages = pageHeight - (margin * 2);
    
    // html2canvas at scale=2 creates 2x resolution
    // jsPDF addImage dimensions are in mm
    // Standard conversion: 96 DPI = 0.264583mm per CSS pixel
    // At scale=2: 1 CSS pixel = 2 canvas pixels
    // For display: 1 CSS pixel = 0.264583mm
    // So: 1 canvas pixel (at scale=2) = 0.132292mm when displayed at 1x
    const pxToMm = 0.132292; // Conversion factor for scale=2 canvas
    const canvasWidthMm = canvas.width * pxToMm;
    const canvasHeightMm = canvas.height * pxToMm;
    
    // Calculate scale to FILL the page - maximize content size
    // We want to use the full available width and height
    const widthScale = availableWidth / canvasWidthMm;
    const heightScaleFirstPage = availableHeightFirstPage / canvasHeightMm;
    
    // Use the larger scale to fill the page better - this makes content bigger
    // But ensure it doesn't overflow by using the smaller one if needed
    const scale = Math.max(widthScale, heightScaleFirstPage);
    
    // Calculate final image dimensions in mm for PDF - fill full available space
    // Use full available width to maximize content size
    const finalImgWidth = availableWidth;
    // Calculate height maintaining aspect ratio
    const calculatedHeight = (canvasHeightMm / canvasWidthMm) * finalImgWidth;
    
    // Use the calculated height (it will be scaled to fit on pages)
    const finalImgHeight = calculatedHeight;

    // Professional header with grey/black gradient
    // Create gradient effect with dark grey to black
    pdf.setFillColor(45, 55, 72); // Dark grey
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Add subtle darker overlay for depth
    pdf.setFillColor(30, 41, 59); // Darker grey/black
    pdf.rect(0, 0, pageWidth, headerHeight * 0.4, 'F');
    
    // Title in white text, centered
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CDK QCOE METRICS REPORT', pageWidth / 2, 12, { align: 'center' });

    // Export date/time in small text, top right corner
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 200, 200); // Light grey for subtle appearance
    const exportDate = new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    pdf.text(exportDate, pageWidth - 10, 8, { align: 'right' });

    // Reset text color for content
    pdf.setTextColor(0, 0, 0);

    // Helper function to add footer on every page
    const addFooter = (pageNum?: number, totalPages?: number) => {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120); // Grey text
      const currentDate = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      pdf.text(`CDK QCOE • Automated Report • Generated by FalconX • ${monthYear}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    };

    // Helper function to add header
    const addHeader = () => {
      pdf.setFillColor(45, 55, 72); // Dark grey
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      pdf.setFillColor(30, 41, 59); // Darker grey/black
      pdf.rect(0, 0, pageWidth, headerHeight * 0.4, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CDK QCOE METRICS REPORT', pageWidth / 2, 12, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(200, 200, 200);
      pdf.text(exportDate, pageWidth - 10, 8, { align: 'right' });
      
      pdf.setTextColor(0, 0, 0);
    };

    let remainingHeight = finalImgHeight;
    let sourceY = 0;
    let pageNumber = 1;

    // Calculate total pages needed (estimate)
    const estimatedTotalPages = Math.ceil(finalImgHeight / (pageHeight - headerHeight - footerHeight - margin * 2));
    
    while (remainingHeight > 0) {
      // Add header on every page
      addHeader();
      
      // For first page, account for header; for subsequent pages, use full page
      const topMargin = pageNumber === 1 ? headerHeight + margin : margin;
      const bottomMargin = footerHeight + margin; // Footer on every page
      const currentYPosition = pageNumber === 1 ? headerHeight + margin : margin;
      
      // Calculate available height for this page - maximize usage
      const availablePageHeight = pageHeight - currentYPosition - bottomMargin;
      const currentImgHeight = Math.min(remainingHeight, availablePageHeight);
      
      // Calculate how much of the canvas we need for this page
      // Use the ratio of content height to total image height
      const contentRatio = currentImgHeight / finalImgHeight;
      const sourceHeight = contentRatio * canvas.height;
      
      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const pageCtx = pageCanvas.getContext('2d');
      
      if (pageCtx) {
        // Draw the slice from the main canvas
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png');
        // Fit image to full available width and height - fill the page
        pdf.addImage(
          pageImgData,
          'PNG',
          margin,
          currentYPosition,
          finalImgWidth,
          currentImgHeight,
          undefined,
          'FAST'
        );
      }

      // Add footer on every page
      addFooter(pageNumber, estimatedTotalPages);
      
      // Add page number on every page
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Update positions for next iteration
      sourceY += sourceHeight;
      remainingHeight -= currentImgHeight;
      pageNumber++;
      
      if (remainingHeight > 0) {
        pdf.addPage();
      }
    }

    pdf.save(filename);
  } finally {
    // Restore original styles
    element.style.width = originalStyles.width;
    element.style.backgroundColor = originalStyles.backgroundColor;
    element.style.overflow = originalStyles.overflow;
    element.style.height = originalStyles.height;
    element.style.padding = originalStyles.padding;
  }
};

export const exportTcoeReportAsExcel = async (row: TcoeExportRow, filename: string = 'tcoe-report.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('TCOE Report');

  worksheet.columns = [
    { header: 'Portfolio / Project', key: 'portfolio', width: 32 },
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Bugs Count', key: 'bugs', width: 12 },
    { header: 'Defects Count', key: 'defects', width: 14 },
    { header: `Week ending ${row.previousLabel}`, key: 'previous', width: 20 },
    { header: `Week ending ${row.currentLabel}`, key: 'current', width: 20 },
    { header: 'WoW Progress', key: 'wow', width: 16 },
    { header: 'Comments', key: 'comments', width: 60 }
  ];

  worksheet.addRow({
    portfolio: `${row.portfolio} • ${row.projectLabel} (Key: ${row.projectKey})`,
    metric: row.metricName,
    bugs: row.bugs,
    defects: row.defects,
    previous: `${Number(row.previousLeakage ?? 0).toFixed(1)}%`,
    current: `${Number(row.currentLeakage ?? 0).toFixed(1)}%`,
    wow: `${row.wowProgress > 0 ? '+' : ''}${Number(row.wowProgress ?? 0).toFixed(1)}%`,
    comments: row.comments
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };

  worksheet.getRow(2).alignment = {
    vertical: 'top',
    horizontal: 'center'
  };
  worksheet.getCell('A2').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  worksheet.getCell('B2').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  worksheet.getCell('H2').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

  worksheet.getColumn('H').alignment = { wrapText: true };

  const debugSheet = workbook.addWorksheet('Debug Data');
  debugSheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Value', key: 'value', width: 100 }
  ];

  const debugRows = [
    { field: 'Portfolio', value: row.portfolio },
    { field: 'Project Label', value: row.projectLabel },
    { field: 'Project Key', value: row.projectKey },
    { field: 'Metric', value: row.metricName },
    { field: 'Bug JQL', value: row.bugsJql || 'Not available' },
    { field: 'Defect JQL', value: row.defectsJql || 'Not available' },
    { field: 'Bug Keys', value: row.bugKeys && row.bugKeys.length ? row.bugKeys.join(', ') : 'None' },
    { field: 'Defect Keys', value: row.defectKeys && row.defectKeys.length ? row.defectKeys.join(', ') : 'None' }
  ];

  debugSheet.addRows(debugRows);
  debugSheet.getColumn('value').alignment = { wrapText: true, vertical: 'top' };
  debugSheet.getColumn('field').alignment = { vertical: 'top' };
  debugSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const exportTcoeReportAsExcelMulti = async (rows: TcoeExportRow[], filename: string = 'tcoe-report.xlsx') => {
  const workbook = new ExcelJS.Workbook();

  const addRowSheets = (row: TcoeExportRow, idx: number) => {
    const sheetName = `TCOE ${idx + 1}`;
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.columns = [
      { header: 'Portfolio / Project', key: 'portfolio', width: 32 },
      { header: 'Metric', key: 'metric', width: 28 },
      { header: 'Bugs Count', key: 'bugs', width: 12 },
      { header: 'Defects Count', key: 'defects', width: 14 },
      { header: `Week ending ${row.previousLabel}`, key: 'previous', width: 20 },
      { header: `Week ending ${row.currentLabel}`, key: 'current', width: 20 },
      { header: 'WoW Progress', key: 'wow', width: 16 },
      { header: 'Comments', key: 'comments', width: 60 }
    ];
    worksheet.addRow({
      portfolio: `${row.portfolio} • ${row.projectLabel} (Key: ${row.projectKey})`,
      metric: row.metricName,
      bugs: row.bugs,
      defects: row.defects,
      previous: `${Number(row.previousLeakage ?? 0).toFixed(1)}%`,
      current: `${Number(row.currentLeakage ?? 0).toFixed(1)}%`,
      wow: `${row.wowProgress > 0 ? '+' : ''}${Number(row.wowProgress ?? 0).toFixed(1)}%`,
      comments: row.comments
    });
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    worksheet.getRow(2).alignment = { vertical: 'top', horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    worksheet.getCell('B2').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    worksheet.getCell('H2').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    worksheet.getColumn('H').alignment = { wrapText: true };

    const debugSheet = workbook.addWorksheet(`Debug ${idx + 1}`);
    debugSheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 100 }
    ];
    const debugRows = [
      { field: 'Portfolio', value: row.portfolio },
      { field: 'Project Label', value: row.projectLabel },
      { field: 'Project Key', value: row.projectKey },
      { field: 'Metric', value: row.metricName },
      { field: 'Bug JQL', value: row.bugsJql || 'Not available' },
      { field: 'Defect JQL', value: row.defectsJql || 'Not available' },
      { field: 'Bug Keys', value: row.bugKeys && row.bugKeys.length ? row.bugKeys.join(', ') : 'None' },
      { field: 'Defect Keys', value: row.defectKeys && row.defectKeys.length ? row.defectKeys.join(', ') : 'None' }
    ];
    debugSheet.addRows(debugRows);
    debugSheet.getColumn('value').alignment = { wrapText: true, vertical: 'top' };
    debugSheet.getColumn('field').alignment = { vertical: 'top' };
    debugSheet.getRow(1).font = { bold: true };
  };

  rows.forEach((r, i) => addRowSheets(r, i));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

// Voice-to-text hook
export const useVoiceToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    
    // Cleanup on unmount
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!isSupported || isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const newRecognition = new SpeechRecognition();
    
    newRecognition.continuous = true;
    newRecognition.interimResults = true;
    newRecognition.lang = 'en-US';

    newRecognition.onstart = () => {
      setIsListening(true);
    };

    newRecognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    newRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setRecognition(null);
    };

    newRecognition.onend = () => {
      setIsListening(false);
      setRecognition(null);
    };

    setRecognition(newRecognition);
    newRecognition.start();
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    setRecognition(null);
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  };
};
