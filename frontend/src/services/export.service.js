// frontend/src/services/export.service.js
// Enterprise Export Service for Invoices (PDF, Excel)

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Export Invoice to PDF using html2canvas + jsPDF (Design-first PDF)
 * This captures the exact UI layout for download/email
 * 
 * @param {HTMLElement} element - The invoice container element (ref.current)
 * @param {string} filename - The filename for the PDF (without .pdf extension)
 * @returns {Promise<void>}
 */
export const exportInvoiceToPDF = async (element, filename = "invoice") => {
  if (!element) {
    throw new Error("Invoice element not found");
  }

  try {
    // Convert HTML to canvas with high quality
    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution for better quality
      useCORS: true, // Allow cross-origin images
      logging: false, // Disable console logging
      backgroundColor: "#ffffff", // White background
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // Calculate PDF dimensions (A4 size in mm)
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    
    // Calculate aspect ratio
    const imgAspectRatio = canvas.width / canvas.height;
    
    // Fit to page width while maintaining aspect ratio
    const finalWidth = pdfWidth;
    const finalHeight = pdfWidth / imgAspectRatio;

    // Convert canvas to image data
    const imgData = canvas.toDataURL("image/png", 1.0);

    // Create PDF document
    const pdf = new jsPDF("p", "mm", "a4");
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate how many pages we need
    const totalPages = Math.ceil(finalHeight / pageHeight);
    
    // Add image across multiple pages
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      const yPosition = -page * pageHeight;
      pdf.addImage(imgData, "PNG", 0, yPosition, finalWidth, finalHeight);
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Error exporting invoice to PDF:", error);
    throw error;
  }
};

// Export as a service object (consistent with invoice.service.js pattern)
export const exportService = {
  exportInvoiceToPDF,
};

export default exportService;

