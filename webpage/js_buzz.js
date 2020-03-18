var map = L.map('map', {'worldCopyJump': true}).setView([0,0], 2);


var attribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                  '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | ' +
                  'Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>';

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiamFja2FzdG5lciIsImEiOiJjamx2bzhmc2YweTAxM2xxcGtqcHJtN3pkIn0.YKUh0QLQT_GHHVMdAyS-Mg',{
    attribution: attribution,
    maxZoom: 20,
    id: 'mapbox.streets',
}).addTo(map);

var markers = L.markerClusterGroup({
    chunkedLoading: true,
    chunkProgress: updateProgressBar,
    iconCreateFunction: function(cluster) {
        var childCount = cluster.getAllChildMarkers().reduce((a,v) => a + v.count, 0)
        return markerIcon(childCount);
    }
});
markers.on('spiderfied', function (a) {
    var allArticles = a.markers.flatMap( function (m) {return m.articles});
    L.popup({maxHeight: 200}).setLatLng(a.cluster.getLatLng()).setContent(makePopupHtml(allArticles, a.markers[0].name)).openOn(map);
});

var casesMarkers = L.markerClusterGroup({
    chunkedLoading: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    chunkProgress: updateProgressBar,
    iconCreateFunction: function(cluster) {
        var childCount = cluster.getAllChildMarkers().reduce((a,v) => a + v.count, 0)
        return casesIcon(childCount);
    }
});

$( function() {
  $( "#slider-range" ).slider({
    range: true,
    min: 0,
    max: 100,
    values: [ 0, 100 ],
    slide: function( event, ui ) {
      terminateAnimation();
      var displayStartMins = ui.values[0];
      var displayEndMins = ui.values[1];

      document.getElementById("display_start_date").valueAsDate = epochMinsToDate(displayStartMins);
      document.getElementById("display_end_date").valueAsDate = epochMinsToDate(displayEndMins);

      var subMarkerList = markersBetween(displayStartMins, displayEndMins);
      markers.clearLayers();
      markers.addLayers(subMarkerList);

      document.getElementById("animate_window").value = "Custom";
      animateWindow = displayEndMins - displayStartMins;
    }
  });
} );

var markerList;
var nodeList;

var dataStartDate;
var dataEndDate;

updateMap();

var animateWindow = 7 * 24 * 60;
var animateStep = 24 * 60;
var animateSpeed = 100;
   

//TODO: make this a binary search since that's definitely more efficient. To bad
// I'm too lazy to do it right the first time. Well, it seems to work as is,
// so why do more work than I have to? Make this change if it's too slow.
function nodeIndexOfTime(time) {
    return nodeList.findIndex(function (e) {
        return e.time >= time;
    });
}

function markersBetween(timeStart, timeEnd) {
    var iStart = nodeIndexOfTime(timeStart)
    var iEnd = nodeIndexOfTime(timeEnd)
    return markerList.slice(iStart, iEnd);
}

function setMarkers(nodes) {
  markers.clearLayers();
  nodeList = nodes;
  markerList = nodeList.map(function (p) {
      var marker = new L.Marker(L.latLng(p.lat, p.lng), { icon: markerIcon(p.count)});
      var articles = JSON.parse(p.articles);
      articles = articles.map(function (a) {
          return {title: a['f1'], url: a['f2']};
      });
      marker.bindPopup(makePopupHtml(articles, p.name),{maxHeight: 100});
      marker.count = p.count;
      marker.name = p.name;
      marker.articles = articles;
      return marker;
  });
  markers.addLayers(markerList);
  map.addLayer(markers);

  if(nodeList.length > 0) {
    var min = nodeList[0].time;
    var max = nodeList[nodeList.length - 1].time;

    dataStartDate = epochMinsToDate(min);
    document.getElementById("start_date").valueAsDate = dataStartDate;
    document.getElementById("display_start_date").valueAsDate = dataStartDate;
    $("#slider-range").slider("option", "min", min);

    dataEndDate = epochMinsToDate(max)
    document.getElementById("end_date").valueAsDate = dataEndDate;
    document.getElementById("display_end_date").valueAsDate = dataEndDate;
    $("#slider-range").slider("option", "max", max);

    $("#slider-range").slider("option", "values", [min, max]);
  }
}

function makePopupHtml(articles, name) {
  var articles_html = articles.map(function(e) {
    return "<li><a href=" + e.url +">" + e.title + "</a></li>";
  }).join("");
  return "<em>"+name+"</em><br><ol>"+articles_html+"</ol>";
}

// 99% sure this isn't the correct way to do this, but I can't be bothered to
// learn proper threading in JS. Not sure it even exists. This looks like it
// works though.
var animating = false;
async function animateMarkers() {
  if (!animating) {
    document.getElementById("animate").value = 'Stop Animation';
    animating = true;
    for (var i = dateToEpochMins(dataStartDate); animating && i < dateToEpochMins(dataEndDate) - animateWindow; i+=animateStep) {
      var subMarkerList = markersBetween(i, i+animateWindow);
      markers.clearLayers();
      markers.addLayers(subMarkerList);

      plotCaseData(i + animateStep/2);

      document.getElementById("display_start_date").valueAsDate = epochMinsToDate(i)
      document.getElementById("display_end_date").valueAsDate = epochMinsToDate(i+animateWindow);
      $("#slider-range").slider("values", [i, i+animateWindow]);

      await new Promise(r => setTimeout(r, animateSpeed));
    }
  } 
  terminateAnimation();
} 

// Since I'm doing a bit of a hack here, the least I can do is hide it in function.
function terminateAnimation() {
    animating = false;
    document.getElementById("animate").value = 'Start Animation';
}

function markerIcon(clusterSize) {
  var size = markerSize(clusterSize);
  var color = markerColor(clusterSize);

  var elemStyle =
    'border-radius: 50%;' +
    'width: '  + size + 'px;' + 
    'height: ' + size + 'px;' +
    'line-height: ' + size + 'px;' +
    'font-weight: bold;' +
    'background-color: ' + color + ';';

  return new L.DivIcon({ html: '<div style="' + elemStyle + '">' + clusterSize + '</div>', className: 'marker-cluster', iconSize: new L.Point(size, size) });
}

function markerSize(clusterSize) {
  return 40 + Math.log(clusterSize)**2;
}

function markerColor(clusterSize) {
  var color;
  if (clusterSize < 10) {
      color = 'rgba(181, 226, 140, 0.6)';
  } else if (clusterSize < 100) {
      color = 'rgba(241, 211, 87, 0.6)';
  } else {
      color = 'rgba(253, 156, 115, 0.6)';
  }
  return color;
}

function constructQueryURL() {
  var keyword = document.getElementById('keyword').value;
  var start_date = new Date(document.getElementById('start_date').value);
  var end_date = new Date(document.getElementById('end_date').value);

  var start_epoch_mins = dateToEpochMins(start_date);
  var end_epoch_mins = dateToEpochMins(end_date) + (1000 * 60) - 1;

  var url = "https://newsstand.umiacs.umd.edu/news/disease_time_query" +
        "?keyword=" + keyword +
        "&start_date=" + start_epoch_mins + 
        "&end_date=" + end_epoch_mins;

  return url;
}

function dateToEpochMins(date) {
    return date.getTime() / (1000 * 60);
}

function epochMinsToDate(mins) {
    return new Date(mins * 60 * 1000);
}

function updateMap() {
    terminateAnimation();
    var loader = document.getElementById('loader');
    loader.style.display = 'block';

    var url = constructQueryURL();
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function (e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var nodes = JSON.parse(xhr.responseText);
          setMarkers(nodes);
        } else {
          console.error(xhr.statusText);
        }
        loader.style.display = 'none';
      }
    }
    xhr.send(null);
}

function plotCaseData(time) {
    casesMarkerList = confirmed_cases.map(function (p) {
        var count = findClosestCount(time, p.time_series);
        var icon = casesIcon(count);
        var marker = L.marker([p.lat, p.lng], {icon: icon});
        marker.count = count;
        return marker;
    });
    casesMarkers.clearLayers();
    casesMarkers.addLayers(casesMarkerList);
    map.addLayer(casesMarkers);
}

function findClosestCount(time, time_series) {
    var i;
    for(i = 0; i<time_series.length; i++){
        if(time_series[i].time - time < (24*60)) {
            return time_series.count;
        }
    }
    return 0;
}

function casesIcon(numCases) {
    var size = markerSize(numCases);
    var color = markerColor(numCases);

    var elemStyle =
      'border-radius: 50%;' +
      'width: '  + size + 'px;' + 
      'height: ' + size + 'px;' +
      'line-height: ' + size + 'px;' +
      'font-weight: bold;' +
      'border: dashed red;';

    return new L.DivIcon({ html: '<div style="' + elemStyle + '">' + numCases + '</div>', className: 'marker-cluster', iconSize: new L.Point(size, size) });
}

function updateProgressBar(processed, total, elapsed, layersArray) {
    var progress = document.getElementById('progress');
    var progressBar = document.getElementById('progress-bar');

    if (elapsed > 500) {
        // if it takes more than half a second to load, display the progress bar:
        progress.style.display = 'block';
        progressBar.style.width = Math.round(processed/total*100) + '%';
    }

    if (processed === total) {
        // all markers processed - hide the progress bar:
        progress.style.display = 'none';
    }
}

function setAnimateWindow(size) {
    animateWindow = parseInt(size);

    var startDate = dateToEpochMins(document.getElementById("display_start_date").valueAsDate);
    var endDate = startDate + animateWindow;

    document.getElementById("display_end_date").valueAsDate = epochMinsToDate(endDate);
    $("#slider-range").slider("values", [startDate, endDate]);

    var subMarkerList = markersBetween(startDate, endDate);
    markers.clearLayers();
    markers.addLayers(subMarkerList);
}

function setAnimateStep(step) {
    animateStep = parseInt(step);
}

function setAnimateSpeed(speed) {
    animateSpeed = parseInt(speed);
}