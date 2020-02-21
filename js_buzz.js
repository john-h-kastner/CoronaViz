var map = L.map('map').setView([0,0], 2);

var tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var markers = L.markerClusterGroup({
    chunkedLoading: true,
    iconCreateFunction: function(cluster) {
        var childCount = cluster.getAllChildMarkers().reduce((a,v) => a + v.count, 0)
        return markerIcon(childCount);
    }
});
var markerList;

updateMap();

function setMarkers(nodes) {
  markers.clearLayers();
  markerList = nodes.map(function (p) {
      var marker = new L.Marker(L.latLng(p.lat, p.lng), { icon: markerIcon(p.count)});
      marker.count = p.count;
      return marker;
  });
  markers.addLayers(markerList);
  map.addLayer(markers);
}

async function animateMarkers() {
  for (var i = 0; i < markerList.length - 10; i++) {
    subMarkerList = markerList.slice(i, i+10);
    markers.clearLayers();
    markers.addLayers(subMarkerList);
    await new Promise(r => setTimeout(r, 100));
  }
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
  var disease_filter = document.getElementById('disease_filter').checked;

  var start_epoch_mins = start_date.getTime() / (1000 * 60);
  var end_epoch_mins = end_date.getTime() / (1000 * 60);

  var url = "https://newsstand.umiacs.umd.edu/news/disease_time_query" +
        "?keyword=" + keyword +
        "&start_date=" + start_epoch_mins + 
        "&end_date=" + end_epoch_mins +
        "&disease_filter=" + disease_filter;

  return url;
}

function updateMap() {
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
      }
    }
    xhr.send(null);
}
