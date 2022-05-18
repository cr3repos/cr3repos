
// Pie Chart Example
var ri = document.getElementById("refferal").innerHTML;
var nw = document.getElementById("nonWorking").innerHTML;
var wb = document.getElementById("weeklyBonus").innerHTML;
var ctx = document.getElementById("myPieChart");
var myPieChart = new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ["REFERRAL", "GLOBAL", "LEVEL"],
    datasets: [{
      data: [ri, nw, wb],
      backgroundColor: ['#4D77FF', '#6BCB77', '#FFE61B'],
      hoverBackgroundColor: ['#332FD0', '#00C897', '#FFD32D'],
      hoverBorderColor: "rgba(234, 236, 244, 1)",
    }],
  },
  options: {
    maintainAspectRatio: false,
    tooltips: {
      backgroundColor: "rgb(255,255,255)",
      bodyFontColor: "#858796",
      borderColor: '#dddfeb',
      borderWidth: 1,
      xPadding: 15,
      yPadding: 15,
      displayColors: false,
      caretPadding: 10,
      responsive: false,
    },
    legend: {
      display: false
    },
    cutout: 60,
  },
});
