import { SafetyAnalysis, Region } from './types';

/**
 * Creates a downloadable JSON file from a JavaScript object.
 * @param data The analysis object to download.
 * @param filename The name of the file.
 */
export const downloadJson = (data: SafetyAnalysis, filename: string): void => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Creates a black and white mask image from a region definition.
 * The masked area is white, and the rest is black.
 * @param region The region (rect or poly) to create a mask for.
 * @param width The width of the mask canvas.
 * @param height The height of the mask canvas.
 * @returns A base64 encoded PNG string of the mask.
 */
export const createMaskFromRegion = (region: Region, width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Fill background with black (area to keep)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Draw the region in white (area to modify)
  ctx.fillStyle = 'white';
  
  if (region.shape === 'rect' && region.x !== undefined && region.y !== undefined && region.w !== undefined && region.h !== undefined) {
    ctx.fillRect(region.x * width, region.y * height, region.w * width, region.h * height);
  } else if (region.shape === 'poly' && region.points) {
    ctx.beginPath();
    ctx.moveTo(region.points[0][0] * width, region.points[0][1] * height);
    for (let i = 1; i < region.points.length; i++) {
      ctx.lineTo(region.points[i][0] * width, region.points[i][1] * height);
    }
    ctx.closePath();
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
};

/**
 * Generates an HTML report and prompts the user to print it (or save as PDF).
 * @param analysis The safety analysis data.
 * @param imageBase64 The base64 string of the analyzed image.
 */
export const generatePdf = (analysis: SafetyAnalysis, imageBase64: string): void => {
    const hazardRows = analysis.hazards
      .map(
        (h) => `
      <tr>
        <td style="vertical-align: top; padding: 8px;">${h.id}</td>
        <td style="vertical-align: top; padding: 8px;">${h.hazard}</td>
        <td style="vertical-align: top; padding: 8px;">
          <strong>Severity:</strong> ${h.risk.severity}<br>
          <strong>Likelihood:</strong> ${h.risk.likelihood}<br>
          <em>${h.risk.reason}</em>
        </td>
        <td style="vertical-align: top; padding: 8px;"><ul>${h.decide_controls.map((c) => `<li>${c}</li>`).join('')}</ul></td>
      </tr>
    `
      )
      .join('');
  
    const reportHtml = `
      <html>
        <head>
          <title>Workplace Safety Analysis Report</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; }
            h1, h2, h3 { color: #1e3a8a; } /* Dark Blue */
            h1 { font-size: 22px; text-align: center; margin-bottom: 5px; }
            h2 { font-size: 18px; border-bottom: 2px solid #93c5fd; padding-bottom: 6px; margin-top: 25px; }
            img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #e0f2fe; font-weight: bold; }
            ul { padding-left: 18px; margin: 0; }
            li { margin-bottom: 4px; }
            .summary { background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px; margin: 15px 0; }
            .risk-badge { display: inline-block; padding: 3px 9px; border-radius: 12px; color: white; font-weight: bold; font-size: 10px; }
            .risk-HIGH { background-color: #dc2626; }
            .risk-MEDIUM { background-color: #f59e0b; }
            .risk-LOW { background-color: #16a34a; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
            .header p { margin: 0; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Workplace Safety Analysis Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <h2>Analyzed Image</h2>
          <img src="${imageBase64}" alt="Analyzed workplace photo" />
          
          <h2>Executive Assessment</h2>
          <div class="summary">
            <p><strong>Overall Risk Level:</strong> <span class="risk-badge risk-${analysis.overall_risk}">${analysis.overall_risk}</span></p>
            <p><strong>Caption:</strong> <em>"${analysis.caption}"</em></p>
            <h3>Summary:</h3>
            <p>${analysis.summary}</p>
          </div>
          
          <h2>Identified Hazards & Controls</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">ID</th>
                <th style="width: 25%;">Hazard Description</th>
                <th style="width: 30%;">Risk Assessment</th>
                <th style="width: 40%;">Recommended Controls</th>
              </tr>
            </thead>
            <tbody>
              ${hazardRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(reportHtml);
      reportWindow.document.close();
      reportWindow.focus();
      setTimeout(() => {
          try {
            reportWindow.print();
          } catch(e) {
            console.error("Printing failed", e);
            reportWindow.alert("Could not open print dialog. Please use your browser's print function (Ctrl+P or Cmd+P).");
          }
      }, 500); // Timeout to allow images and styles to load
    } else {
      alert('Could not open a new window. Please disable your popup blocker for this site to generate the report.');
    }
  };