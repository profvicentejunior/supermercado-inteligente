$(function(){
  const canvas=document.getElementById('salesChart');
  if(canvas){new Chart(canvas,{type:'line',data:{labels:['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],datasets:[{label:'Receita',data:[5200,6100,5700,7400,6900,9100,8420],borderColor:'#5272ed',backgroundColor:'rgba(82,114,237,.10)',fill:true,tension:.38,pointRadius:3,pointBackgroundColor:'#5272ed'}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#9aa4b5',font:{size:10}}},y:{grid:{color:'#f0f2f6'},ticks:{color:'#9aa4b5',font:{size:9},callback:v=>'R$ '+v}}}}});}
  $('#saveSettings').on('click',function(){alert('Nesta Fase 1, os parâmetros são demonstrativos. A persistência e a auditoria serão implementadas na próxima etapa.');});
  $('.settings-nav a').on('click',function(){$('.settings-nav a').removeClass('selected');$(this).addClass('selected');});
});
