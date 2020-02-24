var map = L.map('map', {'worldCopyJump': true}).setView([0,0], 2);

var tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var markers = L.markerClusterGroup({
    chunkedLoading: true,
    chunkProgress: updateProgressBar,
    iconCreateFunction: function(cluster) {
        var childCount = cluster.getAllChildMarkers().reduce((a,v) => a + v.count, 0)
        return markerIcon(childCount);
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
    }
  });
} );

var markerList;
var nodeList;

var dataStartDate;
var dataEndDate;

var displayEndDate
var displayEndDate

   
updateMap();

//TODO: make this a binary search since that's definitly more efficient. To bad
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
    console.log([iStart, iEnd]);
    return markerList.slice(iStart, iEnd);
}

function setMarkers(nodes) {
  markers.clearLayers();
  nodeList = nodes;
  markerList = nodeList.map(function (p) {
      var marker = new L.Marker(L.latLng(p.lat, p.lng), { icon: markerIcon(p.count)});
      marker.count = p.count;
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

// 99% sure this isn't the correct way to do this, but I can't be bothered to
// learn proper threading in JS. Not sure it even exists. This looks like it
// works though.
var animating = false;
async function animateMarkers() {
  if (!animating) {
    animating = true;
    var windowSize = 24*60;
    var stepSize = 60;

    for (var i = dateToEpochMins(dataStartDate); animating && i < dateToEpochMins(dataEndDate) - windowSize; i+=stepSize) {
      var subMarkerList = markersBetween(i, i+windowSize);
      markers.clearLayers();
      markers.addLayers(subMarkerList);

      document.getElementById("display_start_date").valueAsDate = epochMinsToDate(i)
      document.getElementById("display_end_date").valueAsDate = epochMinsToDate(i+windowSize);
      $("#slider-range").slider("values", [i, i+windowSize]);

      await new Promise(r => setTimeout(r, 100));
    }
  } 
  terminateAnimation();
} 

// Since I'm doing a bit of a hack here, the least I can do is hide it in function.
function terminateAnimation() {
    animating = false;
}

function markerIcon(clusterSize) {
  var size = markerSize(clusterSize);
  var color = markerColor(clusterSize);

  var elemStyle =
    'border-radius: 50%;' +
    'width: '  + size + 'px;' + 
    'height: ' + size + 'px;' +
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
