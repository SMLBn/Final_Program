
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
  const labels = Object.keys(collegeGroups);
  const counts = labels.map(c => collegeGroups[c].count);
  const avgAIs = labels.map(c => collegeGroups[c].aiSum / collegeGroups[c].count);
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Number of Students',
          data: counts,
          type: 'bar',
          backgroundColor: '#0b5bd7',
          yAxisID: 'y'
        },
        {
          label: 'Average AI Dependency Score',
          data: avgAIs,
          type: 'line',
          borderColor: '#0b7df7',
          fill: false,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Number of Students'
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'AI Dependency Score'
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
  if(recs.length===0) recs.push('No immediate concerns; encourage balanced AI use for scaffolding only.');
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
