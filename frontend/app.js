
// Simple CSV loader + chart rendering
async function loadCSV() 
{
  const BACKEND_URL = "http://127.0.0.1:8000";
  const res = await fetch('data.csv');
  const text = await res.text();
  const rows = text.trim().split('\n');
  const headers = rows[0].split(',');
  const data = rows.slice(1).map(r=>{
    const cols = r.split(',');
    const obj = {};
    headers.forEach((h,i)=> obj[h]=cols[i]);
    return obj;
  });
  return data;
}

let dataset = [];
let barChart, lineChart;

function number(x){ return isNaN(parseFloat(x))?0:parseFloat(x); }

function calcAvgGrade(data){
  const vals = data.map(d=>number(d.Final_Grade));
  return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
}

function buildDropdown(data){
  const sel = document.getElementById('studentSelect');
  sel.innerHTML = '';
  data.forEach(d=>{
    const opt = document.createElement('option');
    opt.value = d.Student_ID;
    opt.text = `${d.Student_ID} — ${d.College}`;
    sel.appendChild(opt);
  });
}

function updateCards(data){
  document.getElementById('aiIndex').innerText = data.AI_Dependency_Index || '—';
  const risk = (number(data.High_Risk_Flag)===1 || number(data.AI_Dependency_Index)>5.5) ? 'HIGH' : 'LOW';
  document.getElementById('riskStatus').innerText = risk;
  document.getElementById('avgGrade').innerText = calcAvgGrade(dataset);
  document.getElementById('totalResp').innerText = dataset.length;
}

function renderBar(data){
  const ctx = document.getElementById('barChart').getContext('2d');
  const vals = [
    number(data.Reading_Dependency_Score),
    number(data.Writing_Dependency_Score),
    number(data.Numeracy_Dependency_Score)
  ];
  if(barChart) barChart.destroy();
  barChart = new Chart(ctx,{type:'bar',data:{
    labels:['Reading','Writing','Numeracy'],
    datasets:[{label:'Dependency Score',data:vals,backgroundColor:['#0b5bd7','#0b7df7','#74b9ff']}]},
    options:{scales:{y:{beginAtZero:true,max:7}}}});
}

function renderLine(){
  const ctx = document.getElementById('lineChart').getContext('2d');
  
  // Group by college and calculate average AI Dependency Score and count of students
  const collegeGroups = {};
  dataset.forEach(d => {
    const college = d.College;
    if (!collegeGroups[college]) {
      collegeGroups[college] = { count: 0, aiSum: 0 };
    }
    collegeGroups[college].count++;
    collegeGroups[college].aiSum += number(d.AI_Dependency_Index);
  });
  
  // Sort by college name for consistent display
  const fullLabels = Object.keys(collegeGroups).sort();
  const counts = fullLabels.map(c => collegeGroups[c].count);
  const avgAIs = fullLabels.map(c => collegeGroups[c].aiSum / collegeGroups[c].count);
  
  // Create abbreviations
  const labels = fullLabels.map(label => {
    const words = label.replace('College of ', '').split(' ');
    if (words.length === 1) return words[0].substring(0, 4);
    return words.map(w => w[0]).join('').substring(0, 3);
  });
  
  if(lineChart) lineChart.destroy();
  
  lineChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Number of Students',
          data: counts,
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
          yAxisID: 'y',
          order: 2
        },
        {
          label: 'Average AI Dependency Score',
          data: avgAIs,
          type: 'line',
          borderColor: '#93c5fd',
          backgroundColor: '#93c5fd',
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#93c5fd',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          fill: false,
          yAxisID: 'y1',
          order: 1,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { 
          display: true,
          position: 'top',
          labels: {
            boxWidth: 15,
            padding: 10,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          callbacks: {
            title: function(context) {
              return fullLabels[context[0].dataIndex];
            },
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.dataset.yAxisID === 'y1') {
                label += context.parsed.y.toFixed(2);
              } else {
                label += context.parsed.y;
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: false,
            font: {
              size: 9
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          display: true,
          title: {
            display: true,
            text: 'Number of Students',
            font: {
              size: 11
            }
          },
          ticks: {
            font: {
              size: 10
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          display: true,
          title: {
            display: true,
            text: 'AI Dependency Score',
            font: {
              size: 11
            }
          },
          ticks: {
            font: {
              size: 10
            }
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}
function generateRecommendations(data){
  const ai = number(data.AI_Dependency_Index);
  const mot = number(data.Motivation_Score);
  const env = number(data.Environment_Score);
  let recs = [];
  if(ai>6){ recs.push('High AI reliance detected — recommend writing workshops and guided assignments to rebuild skill.'); }
  if(mot<4){ recs.push('Low autonomous motivation — consider autonomy-supportive tasks and formative feedback.'); }
  if(env>5){ recs.push('Strong peer reliance — promote collaborative but independent tasks; monitor group dependency.'); }
  if(recs.length===0) recs.push('No immediate concerns; encourage balanced AI use only.');
  document.getElementById('recoText').innerHTML = '<ul><li>'+recs.join('</li><li>')+'</li></ul>';
}

document.getElementById('loadBtn').addEventListener('click', async ()=>{
  const sel = document.getElementById('studentSelect');
  const id = sel.value;
  const record = dataset.find(d=>d.Student_ID===id);
  if(!record) return;
  updateCards(record);
  renderBar(record);
  renderLine();
  generateRecommendations(record);
});
// Add this function to generate PDF reports
async function generateReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const sel = document.getElementById('studentSelect');
  const id = sel.value;
  const record = dataset.find(d => d.Student_ID === id);
  
  if (!record) {
    alert('Please select a student first');
    return;
  }
  
  // Show loading indicator
  const reportsBtn = document.querySelector('a[href="#"][onclick*="generateReport"]') || 
                     document.getElementById('reportsBtn');
  const originalText = reportsBtn ? reportsBtn.innerText : 'Reports';
  if (reportsBtn) reportsBtn.innerText = 'Generating...';
  
  try {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 20;
    
    // Header
    doc.setFillColor(11, 91, 215);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('IntelliGrade Report', margin, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Laguna State Polytechnic University - San Pablo City Campus', margin, 33);
    
    yPos = 50;
    doc.setTextColor(0, 0, 0);
    
    // Student Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Information', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Student ID: ${record.Student_ID}`, margin, yPos);
    yPos += 6;
    doc.text(`College: ${record.College}`, margin, yPos);
    yPos += 6;
    doc.text(`Year Level: ${record.Year_Level || 'N/A'}`, margin, yPos);
    yPos += 6;
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 12;
    
    // Key Metrics Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Metrics', margin, yPos);
    yPos += 8;
    
    // Metrics boxes
    const metrics = [
      { label: 'AI Dependency Index', value: record.AI_Dependency_Index },
      { label: 'Predicted Risk', value: (number(record.High_Risk_Flag) === 1 || number(record.AI_Dependency_Index) > 5.5) ? 'HIGH' : 'LOW' },
      { label: 'Final Grade', value: record.Final_Grade },
      { label: 'Motivation Score', value: record.Motivation_Score }
    ];
    
    const boxWidth = (pageWidth - 2 * margin - 15) / 2;
    const boxHeight = 15;
    let xPos = margin;
    
    doc.setFontSize(9);
    metrics.forEach((metric, idx) => {
      if (idx % 2 === 0 && idx > 0) {
        yPos += boxHeight + 5;
        xPos = margin;
      }
      
      // Draw box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'FD');
      
      // Label
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(metric.label, xPos + 3, yPos + 5);
      
      // Value
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(String(metric.value), xPos + 3, yPos + 11);
      doc.setFontSize(9);
      
      xPos += boxWidth + 5;
    });
    
    yPos += boxHeight + 15;
    
    // Dependency Domains Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Dependency Domain Scores', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reading: ${record.Reading_Dependency_Score}`, margin, yPos);
    yPos += 6;
    doc.text(`Writing: ${record.Writing_Dependency_Score}`, margin, yPos);
    yPos += 6;
    doc.text(`Numeracy: ${record.Numeracy_Dependency_Score}`, margin, yPos);
    yPos += 12;
    
    // Capture Bar Chart
    const barChartCanvas = document.getElementById('barChart');
    if (barChartCanvas) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Dependency Domains Chart', margin, yPos);
      yPos += 8;
      
      const barChartImg = barChartCanvas.toDataURL('image/png');
      const chartWidth = pageWidth - 2 * margin;
      const chartHeight = 60;
      doc.addImage(barChartImg, 'PNG', margin, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 15;
    }
    
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    // Recommendations Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations', margin, yPos);
    yPos += 8;
    
    const ai = number(record.AI_Dependency_Index);
    const mot = number(record.Motivation_Score);
    const env = number(record.Environment_Score);
    let recs = [];
    
    if (ai > 6) {
      recs.push('High AI reliance detected - recommend writing workshops and guided assignments to rebuild skill.');
    }
    if (mot < 4) {
      recs.push('Low autonomous motivation - consider autonomy-supportive tasks and formative feedback.');
    }
    if (env > 5) {
      recs.push('Strong peer reliance - promote collaborative but independent tasks; monitor group dependency.');
    }
    if (recs.length === 0) {
      recs.push('No immediate concerns; encourage balanced AI use for scaffolding only.');
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    recs.forEach((rec, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 2 * margin - 5);
      lines.forEach(line => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 2;
    });
    
    // Add new page for college distribution
    doc.addPage();
    yPos = 20;
    
    // College Distribution Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('College-Wide Analysis', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Students Analyzed: ${dataset.length}`, margin, yPos);
    yPos += 6;
    doc.text(`Average Grade (All Students): ${calcAvgGrade(dataset)}`, margin, yPos);
    yPos += 12;
    
    // Capture Pie/Line Chart
    const lineChartCanvas = document.getElementById('lineChart');
    if (lineChartCanvas) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Distribution by College', margin, yPos);
      yPos += 8;
      
      const lineChartImg = lineChartCanvas.toDataURL('image/png');
      const chartWidth = pageWidth - 2 * margin;
      const chartHeight = 100;
      doc.addImage(lineChartImg, 'PNG', margin, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 10;
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('IntelliGrade • All Rights Reserved • DevCo-BLV (2025)', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Save the PDF
    doc.save(`IntelliGrade_Report_${record.Student_ID}_${Date.now()}.pdf`);
    
  } catch (error) {
    console.error('Error generating report:', error);
    alert('Error generating report. Please try again.');
  } finally {
    // Reset button text
    if (reportsBtn) reportsBtn.innerText = originalText;
  }
}

// Add event listener for Reports button
document.addEventListener('DOMContentLoaded', () => {
  const reportsBtn = document.getElementById('reportsBtn');
  if (reportsBtn) {
    reportsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      generateReport();
    });
  }
});

// Settings functionality
let appSettings = {
  theme: 'light',
  chartAnimation: true,
  riskThreshold: 5.5,
  autoRefresh: false,
  refreshInterval: 300,
  exportFormat: 'pdf',
  includeCharts: true,
  enableNotifications: true,
  notifyHighRisk: true
};

function openSettings() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'block';
  
  // Load current settings
  loadSettingsUI();
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'none';
}

function loadSettingsUI() {
  // Load saved settings from localStorage
  const savedSettings = localStorage.getItem('appSettings');
  if (savedSettings) {
    appSettings = JSON.parse(savedSettings);
  }
  
  // Populate UI with current settings
  const activeUser = localStorage.getItem('activeUser');
  document.getElementById('userName').value = activeUser || 'Admin';
  document.getElementById('themeSelect').value = appSettings.theme;
  document.getElementById('chartAnimation').checked = appSettings.chartAnimation;
  document.getElementById('riskThreshold').value = appSettings.riskThreshold;
  document.getElementById('autoRefresh').checked = appSettings.autoRefresh;
  document.getElementById('refreshInterval').value = appSettings.refreshInterval;
  document.getElementById('refreshInterval').disabled = !appSettings.autoRefresh;
  document.getElementById('exportFormat').value = appSettings.exportFormat;
  document.getElementById('includeCharts').checked = appSettings.includeCharts;
  document.getElementById('enableNotifications').checked = appSettings.enableNotifications;
  document.getElementById('notifyHighRisk').checked = appSettings.notifyHighRisk;
  
  // Apply current theme
  applyTheme(appSettings.theme);
}

function saveSettings() {
  // Get values from UI
  appSettings.theme = document.getElementById('themeSelect').value;
  appSettings.chartAnimation = document.getElementById('chartAnimation').checked;
  appSettings.riskThreshold = parseFloat(document.getElementById('riskThreshold').value);
  appSettings.autoRefresh = document.getElementById('autoRefresh').checked;
  appSettings.refreshInterval = parseInt(document.getElementById('refreshInterval').value);
  appSettings.exportFormat = document.getElementById('exportFormat').value;
  appSettings.includeCharts = document.getElementById('includeCharts').checked;
  appSettings.enableNotifications = document.getElementById('enableNotifications').checked;
  appSettings.notifyHighRisk = document.getElementById('notifyHighRisk').checked;
  
  // Save to localStorage
  localStorage.setItem('appSettings', JSON.stringify(appSettings));
  
  // Apply theme
  applyTheme(appSettings.theme);
  
  // Update chart animations
  if (barChart) {
    barChart.options.animation = appSettings.chartAnimation;
  }
  if (lineChart) {
    lineChart.options.animation = appSettings.chartAnimation;
  }
  
  // Show success message
  alert('Settings saved successfully!');
  
  // Close modal
  closeSettings();
  
  // Reload current student to apply new settings
  const sel = document.getElementById('studentSelect');
  if (sel.value) {
    document.getElementById('loadBtn').click();
  }
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

function exportAllData() {
  if (!dataset || dataset.length === 0) {
    alert('No data available to export');
    return;
  }
  
  // Convert dataset to CSV
  const headers = Object.keys(dataset[0]);
  const csvContent = [
    headers.join(','),
    ...dataset.map(row => headers.map(header => row[header]).join(','))
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `IntelliGrade_AllData_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  alert('Data exported successfully!');
}

function clearCache() {
  if (confirm('Are you sure you want to clear the cache? This will not delete your data.')) {
    // Clear only cache-related items, keep user session
    const activeUser = localStorage.getItem('activeUser');
    const settings = localStorage.getItem('appSettings');
    
    localStorage.clear();
    
    // Restore essential items
    if (activeUser) localStorage.setItem('activeUser', activeUser);
    if (settings) localStorage.setItem('appSettings', settings);
    
    alert('Cache cleared successfully!');
  }
}

// Enable/disable refresh interval input based on auto-refresh checkbox
document.addEventListener('DOMContentLoaded', () => {
  const autoRefreshCheckbox = document.getElementById('autoRefresh');
  const refreshIntervalInput = document.getElementById('refreshInterval');
  
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.addEventListener('change', (e) => {
      refreshIntervalInput.disabled = !e.target.checked;
    });
  }
});

// Settings button event listener
const settingsBtn = document.querySelectorAll('.nav-btn')[2]; // Settings is the 3rd button
if (settingsBtn) {
  settingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
  });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  const modal = document.getElementById('settingsModal');
  if (event.target === modal) {
    closeSettings();
  }
});
// Dashboard functionality
function refreshDashboard() {
  // Reset to overview state
  const sel = document.getElementById('studentSelect');
  
  if (dataset.length > 0) {
    // Select first student
    sel.value = dataset[0].Student_ID;
    
    // Load first student's data
    const record = dataset.find(d => d.Student_ID === sel.value);
    if (record) {
      updateCards(record);
      renderBar(record);
      generateRecommendations(record);
    }
    
    // Always render the college trend chart
    renderLine();
    
    // Show success notification if notifications are enabled
    if (appSettings.enableNotifications) {
      showNotification('Dashboard refreshed successfully!');
    }
  }
}

// Simple notification function
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Hide and remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Dashboard button event listener
const dashboardBtn = document.querySelectorAll('.nav-btn')[0]; // Dashboard is the 1st button
if (dashboardBtn) {
  dashboardBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to dashboard button
    dashboardBtn.classList.add('active');
    
    // Refresh dashboard
    refreshDashboard();
  });
}
// initialize
(async ()=>{
  dataset = await loadCSV();
  buildDropdown(dataset);
  document.getElementById('totalResp').innerText = dataset.length;
  document.getElementById('avgGrade').innerText = calcAvgGrade(dataset);
  renderLine(); // render the trend chart on load
  // auto-load first student
  if(dataset.length>0){
    document.getElementById('studentSelect').value = dataset[0].Student_ID;
    document.getElementById('loadBtn').click();
  }
})();
