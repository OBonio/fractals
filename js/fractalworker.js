var ctxWidth = 500;
var ctxHeight = 384;
var cx = -0.6;
var cy = 0;
var xScale = 0.0035;
var yScale = 0.003;
var limit=4;
var iterations=1000;
 
function calcFractal() {
  for(var x=0-ctxWidth; x<ctxWidth; x++)
  {
    var fractalData = [ ];
    for(var y=0-ctxHeight; y<ctxHeight; y++) {
      var ax=cx+x*xScale; 
      var ay=cy+y*yScale;

      var a1=ax, b1=ay, lp=0;
      do
      {
        lp++;
        var a2=(a1*a1)-(b1*b1)+ax;
        var b2=(2*a1*b1)+ay;
        a1=a2; 
        b1=b2;
      } while(!((lp>iterations) || ((a1*a1)+(b1*b1)>limit)));
      lp=lp>iterations ? 0 : lp;
      fractalData.push(lp);
    }
    //console.log(fractalData.length);
    postMessage(fractalData);
  }
}

onmessage = function(e) {
  console.log(e.data.paramName + ' - ' + e.data.paramValue);
  switch(e.data.paramName)
  {
    case 'ctxWidth' : 
      ctxWidth = e.data.paramValue;
      break;
    case 'ctxHeight' : 
      ctxHeight = e.data.paramValue;
      break;
    case 'xScale' : 
      xScale = e.data.paramValue;
      break;
    case 'yScale' : 
      yScale = e.data.paramValue;
      break;
    case 'cx' : 
      cx = e.data.paramValue;
      break;
    case 'cy' : 
      cy = e.data.paramValue;
      break;
    case 'it' : 
      iterations=e.data.paramValue;
      break;
    case 'limit' : 
      limit=e.data.paramValue;
      break;
    case 'go' : 
      calcFractal();
      break;
  }
}
