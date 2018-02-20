var canvas;
var ctx;
var topY=0;
var linePos=0;
var cx=-0.6, cy=-0, yScale=0.0025, xScale=0.0022;
var limit=4;
var primaryColors = [ { r:0, g: 0, b: 0}, { r:0, g: 255, b: 255}, {r:255, g:0, b:255}, {r:13, g:13, b:128}, {r:255, g:128, b: 64} ];
var colors = [];
var iterations = 1000;
var dblBuff;
var needsRedraw = false;
var fractalWorker; 
var dblBuffImage;
var buf;
var buf8;
var data;    

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function myAlert(msg)
{
  $('#myAlert').text(msg);
  $('#myAlert').show().delay(5000).fadeOut();  
}

function getCols()
{
  var retVal = '';
  for(var colLoop=0; colLoop<primaryColors.length; colLoop++)
  {
    retVal += (retVal=='' ? '' : ',') + rgbToHex(primaryColors[colLoop]);
  }
  return retVal;
}

function shareFractal()
{
  var urlCopy = document.getElementById('urlCopy');
  var url = document.location.href;
  url = url.split('?').length > 1 ? url.split('?')[0] : url;
  url += "?cx={0}&cy={1}&xScale={2}&yScale={3}&i={4}&cols={5}".format(cx, cy, xScale, yScale, iterations, getCols());
  urlCopy.value = url;
  urlCopy.select();
  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Copying text command was ' + msg);
    myAlert('Url copied to clipboard {0}'.format(url));
  } catch (err) {
    console.log('Oops, unable to copy');
  }  
}

function getQuery(paramName)
{
  var queryArr = location.search.substring(1).split('&');
  for(var queryLoop=0; queryLoop<queryArr.length; queryLoop++)
  {
    var nameVal = queryArr[queryLoop].split('=');
    console.log(nameVal[0] + ' = ' + nameVal[1]);
    if(nameVal[0]==paramName)
      return nameVal[1];
  }
  return null;
}

function getQueryNum(paramName)
{
  var retVal = getQuery(paramName);
  return retVal ? Number.parseFloat(retVal) : null;
}

function randomiseColors()
{
  for(var colorIndex=1; colorIndex < primaryColors.length; colorIndex++)
  {
    var color = primaryColors[colorIndex];
    color.r = Math.floor(Math.random() * 255);  
    color.g = Math.floor(Math.random() * 255);  
    color.b = Math.floor(Math.random() * 255);  
  }
  setupPallette();
  setupColors();
  needsRedraw = true;
}

function drawFractal()
{
  var ctxWidth = canvas.width / 2;                                                                         
  var ctxHeight = canvas.height / 2;
  cx=getQueryNum('cx') || -0.6; 
  cy=getQueryNum('cy') || -0; 
  yScale=getQueryNum('yScale') ||0.0025; 
  xScale=getQueryNum('xScale') ||0.0022;
  iterations=getQueryNum('i') || 1000;
  if(getQuery('cols'))
  {
    //primaryColors = [];
    var cols = getQuery('cols').split(',');
    for(var colLoop=0; colLoop<cols.length; colLoop++)
    {
      var col = cols[colLoop];
      var r = col[0] + col[1];
      var g = col[2] + col[3];
      var b = col[4] + col[5];
      primaryColors[colLoop] = JSON.parse('{ "r": ' + parseInt(r, 16) + ', "g": ' + parseInt(g, 16) + ', "b": ' + parseInt(b, 16) + ' }');
    }
    //primaryColors.reverse();
    setupPallette();
    setupColors();
  }
  if(!fractalWorker) { // we could be calling this just as a reset
    fractalWorker = new Worker('js/fractalworker.js');
    fractalWorker.onmessage = drawToDblBuff;
  }
  fractalWorker.postMessage({ paramName: 'ctxWidth', paramValue: ctxWidth });
  fractalWorker.postMessage({ paramName: 'ctxHeight', paramValue: ctxHeight });
  fractalWorker.postMessage({ paramName: 'cx', paramValue: cx });
  fractalWorker.postMessage({ paramName: 'cy', paramValue: cy });
  fractalWorker.postMessage({ paramName: 'xScale', paramValue: xScale });
  fractalWorker.postMessage({ paramName: 'yScale', paramValue: yScale });
  fractalWorker.postMessage({ paramName: 'it', paramValue: iterations });
  fractalWorker.postMessage({ paramName: 'limit', paramValue: limit });
  linePos=0;
  needsRedraw=true;
  requestAnimationFrame(drawDblBuff);
  fractalWorker.postMessage({ paramName: 'go' });
}

function drawDblBuff()
{
  if(needsRedraw && dblBuff.length > 0)
  {
    for(var linePos=0; linePos<dblBuff.length; linePos++)
    {
      for(var arrLoop=0; arrLoop<dblBuff[linePos].length; arrLoop++)
      {
        if(colors[dblBuff[linePos][arrLoop]])
          data[arrLoop * ctx.canvas.width + linePos] = 255 << 24 | (colors[dblBuff[linePos][arrLoop]].b << 16) | ((colors[dblBuff[linePos][arrLoop]].g << 8)) | colors[dblBuff[linePos][arrLoop]].r;
        else
          console.log(linePos + ', ' + arrLoop + ' - ' + dblBuff[linePos][arrLoop]);
      }                            
    }
    dblBuffImage.data.set(buf8);
    ctx.putImageData(dblBuffImage, 0, 0);
  }
  needsRedraw = false;
  requestAnimationFrame(drawDblBuff);
}

function drawToDblBuff(e)
{
  for(var arrLoop=0; arrLoop<e.data.length; arrLoop++)
  {
    if(!dblBuff[linePos]) {
      dblBuff[linePos] = [];
    }
    dblBuff[linePos][arrLoop] = e.data[arrLoop];
  }
  linePos++;
  needsRedraw = true;
}

function setupColors()
{
  var colorStep = iterations * 1.0 / primaryColors.length;
  colors = [];
  for(var colLoop=1; colLoop<=primaryColors.length; colLoop++)
  {
    var rStep = ((colLoop==primaryColors.length ? 0 : primaryColors[colLoop].r) - primaryColors[colLoop-1].r) / colorStep;
    var gStep = ((colLoop==primaryColors.length ? 0 : primaryColors[colLoop].g) - primaryColors[colLoop-1].g) / colorStep;
    var bStep = ((colLoop==primaryColors.length ? 0 : primaryColors[colLoop].b) - primaryColors[colLoop-1].b) / colorStep;
    for(var stepLoop=0; stepLoop < colorStep; stepLoop++)
    {
      var red = (stepLoop * rStep) + primaryColors[colLoop-1].r;
      var green = (stepLoop * gStep) + primaryColors[colLoop-1].g;
      var blue = (stepLoop * bStep)  + primaryColors[colLoop-1].b;
      colors.push({ 'r' : red, 'g': green, 'b': blue });
    }
  }
  colors.push({ 'r': 0, 'g': 0,'b': 0});
}

var hexDigits = new Array
        ("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"); 

//Function to convert rgb color to hex format
function rgb2hex(rgb) {
 rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
 return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function hex(x) {
  return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
}
 
function splitOutColor(col, jscol)
{
  var val = rgb2hex(jscol.style.backgroundColor);
  val = val.substring(1); 
  var r = val[0] + val[1];
  var g = val[2] + val[3];
  var b = val[4] + val[5];
  primaryColors[col] = JSON.parse('{ "r": ' + parseInt(r, 16) + ', "g": ' + parseInt(g, 16) + ', "b": ' + parseInt(b, 16) + ' }');
  console.log(primaryColors[col]);
  setupColors();
  needsRedraw = true;
  drawDblBuff();
}

function pad(str)
{
  return str.length < 2 ? '0' + str : str;
}

function rgbToHex(color)
{
  return pad(color.r.toString(16)) + pad(color.g.toString(16)) + pad(color.b.toString(16));
}

function setupPallette()
{
  var palletteDiv = document.getElementById('pallette');
  palletteDiv.innerHTML = '';
  for(var colLoop=0; colLoop<primaryColors.length; colLoop++)
  {
    var button = document.createElement('button');
    button.style = 'width:13px; height:13px; margin-left:8px; border: solid 1px white; cursor: pointer;';
    var picker = new jscolor(button, {valueElement:null});
    picker.fromRGB(primaryColors[colLoop].r, primaryColors[colLoop].g, primaryColors[colLoop].b);
    palletteDiv.appendChild(button);
    palletteDiv.appendChild(document.createElement('br'));  }
}

function leftMousePressed(e)
{
    e = e || window.event;
    var button = e.which || e.button;
    return button == 1;
}

function colorPickerOpen()
{
  var colors = document.getElementById('pallette').getElementsByTagName('button');
  for(var colLoop=0; colLoop<colors.length; colLoop++)
  {
    if(colors[colLoop].classList.contains('jscolor-active'))
    {
      splitOutColor(colLoop, colors[colLoop]);
      return true;
    }
  }
  return false;
}

function initCanvas()
{
  canvas = document.getElementById('fractal');
  canvas.width = window.innerWidth; //document.body.clientWidth; //document.width is obsolete
  canvas.height = window.innerHeight; //document.body.clientHeight; //document.height is obsolete
  ctx = canvas.getContext('2d');
  dblBuff = [];

  dblBuffImage = ctx.createImageData(ctx.canvas.width,ctx.canvas.height);
  buf = new ArrayBuffer(dblBuffImage.data.length);
  buf8 = new Uint8ClampedArray(buf);
  data = new Uint32Array(buf);  
}

function init()
{
  setupPallette();
  setupColors();
  initCanvas();
   
  $("#fractal").mousedown(function (e) {
      if(needsRedraw || colorPickerOpen())
        return;
      if(leftMousePressed(e))
      {                                        
        $("#big-ghost").remove();
        $(".ghost-select").addClass("ghost-active");
        $(".ghost-select").css({
          'left': e.pageX,
          'top': e.pageY
        });

        initialW = e.pageX;
        initialH = e.pageY;

        $(document).bind("mouseup", zoomFractal);
        $(document).bind("mousemove", openSelector);
      }
    });

  $("#fractal").on('touchstart', function (e) {
      if(needsRedraw || colorPickerOpen())
        return;
      e.preventDefault();                                        
      $("#big-ghost").remove();
      $(".ghost-select").addClass("ghost-active");
      $(".ghost-select").css({
          'left': e.touches[0].pageX,
          'top': e.touches[0].pageY
      });

      initialW = e.touches[0].pageX;
      initialH = e.touches[0].pageY;

      $(document).bind("touchend", zoomFractal);
      $(document).bind("touchmove", openSelector);
    });

  drawFractal();

  window.addEventListener("orientationchange", function() {
    initCanvas();
    drawFractal();
  }, false);
}

function openSelector(e) {
    e = e.touches ? e.touches[0] : e;
    var w = Math.abs(initialW - e.pageX);
    var h = Math.abs(initialH - e.pageY);

    $(".ghost-select").css({
        'width': w,
        'height': h
    });
    if (e.pageX <= initialW && e.pageY >= initialH) {
        $(".ghost-select").css({
            'left': e.pageX
        });
    } else if (e.pageY <= initialH && e.pageX >= initialW) {
        $(".ghost-select").css({
            'top': e.pageY
        });
    } else if (e.pageY < initialH && e.pageX < initialW) {
        $(".ghost-select").css({
            'left': e.pageX,
            "top": e.pageY
        });
    }
}

function zoomFractal(e) {
    e = e.changedTouches ? e.changedTouches[0] : e;
    $(document).unbind("mousemove", openSelector);                                                                                                                         
    $(document).unbind("mouseup", zoomFractal);
    $(document).unbind("touchmove", openSelector);                                                                                                                         
    $(document).unbind("touchend", zoomFractal);
    $(".ghost-select").removeClass("ghost-active");
    $(".ghost-select").width(0).height(0);
    
    var w = Math.abs(initialW - e.pageX);
    var h = Math.abs(initialH - e.pageY);
    var topLeftY = (initialH < e.pageY ? initialH : e.pageY) - canvas.offsetTop;
    var topLeftX = (initialW < e.pageX ? initialW : e.pageX) - canvas.offsetLeft;
    var aElem = $(".ghost-select");

    topLeftX = topLeftX - (canvas.width / 2);
    topLeftY = topLeftY - (canvas.height / 2);

    var ratioW = w / canvas.width;
    var ratioH = h / canvas.height;
    
    var originX = (topLeftX + (w/2)) * xScale + cx;
    var originY = (topLeftY + (h/2)) * yScale + cy;
    
    cx = originX;
    cy = originY;
    xScale = xScale * ratioW;
    yScale = yScale * ratioH;  

    fractalWorker.postMessage({ paramName: 'cx', paramValue: cx });
    fractalWorker.postMessage({ paramName: 'cy', paramValue: cy });
    fractalWorker.postMessage({ paramName: 'xScale', paramValue: xScale });
    fractalWorker.postMessage({ paramName: 'yScale', paramValue: yScale });

    linePos = 0;
    needsRedraw = true;
    fractalWorker.postMessage({ paramName: 'go' });
}
