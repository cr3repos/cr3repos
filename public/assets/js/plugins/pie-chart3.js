
var ctxThree = document.getElementById("myPieChart3");

var myPieChart3 = new Chart(ctxThree, {
  type: 'doughnut',
  data: {
    datasets: [{
      data: [20, 20, 20, 20, 20],
      backgroundColor: ['#4D77FF', '#6BCB77', '#FFE61B', '#8A39E1', '#F76E11'],
      hoverBackgroundColor: ['#332FD0', '#00C897', '#FFD32D', '#E15FED', '#FF9F45'],
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
    cutout: 65,
  },
});
