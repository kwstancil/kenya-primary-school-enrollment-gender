
(function () {

  'use strict';
  
  adjustHeight();
  window.addEventListener('resize', adjustHeight)

  function adjustHeight () {
    const mapSize = document.querySelector("#map"),
        contentSize = document.querySelector("#content"),
        removeHeight = document.querySelector('#footer').offsetHeight,
        resize = window.innerHeight - removeHeight;

    mapSize.style.height = `${resize}px`

    if (window.innerWidth >= 768) {
      contentSize.style.height = `${resize}px`
      mapSize.style.height = `${resize}px`
    } else {
      contentSize.style.height = `${resize * 0.25}px`
      mapSize.style.height = `${resize * 0.75 }px`
    }
  }

  const button = document.querySelector("#legend button")
  button.addEventListener('click', function() {
    const legend = document.querySelector(".leaflet-legend")
    legend.classList.toggle('show-legend')
  })
  

  var map = L.map('map', {
    zoomSnap: .1,
    center: [-.23, 37.8],
    zoomControl: false,
    minZoom: 6,
    maxZoom: 9,
    maxBounds: L.latLngBounds([-6.22, 27.72], [5.76, 47.83])
  });


  // mapbox API parameters
  const accessToken = `pk.eyJ1Ijoib3V0cmFnZWdpcyIsImEiOiJjamY4ZWY1NXQyZWduMnFxN2M5cnB1YTJ6In0.BehfRddq9HyWFiy0mmGEbA`
  const yourName = 'outragegis'
  const yourMap = 'ck7436ly919ae1llmvmtabv1n'

  // request a mapbox raster tile layer and add to map
  L.tileLayer(`https://api.mapbox.com/styles/v1/${yourName}/${yourMap}/tiles/256/{z}/{x}/{y}?access_token=${accessToken}`, {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, and <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18
  }).addTo(map);

  omnivore.csv('data/kenya_education_2014.csv').addTo(map);

  // create Leaflet control for the legend
  const legendControl = L.control({
    position: 'bottomright'
  });

  legendControl.onAdd = function () {

    const legend = L.DomUtil.get("legend");

    L.DomEvent.disableScrollPropagation(legend);
    L.DomEvent.disableClickPropagation(legend);

    return legend;

  }

  legendControl.addTo(map);

  // create Leaflet control for the slider
  const sliderControl = L.control({
    position: 'bottomleft'
  });

  sliderControl.onAdd = function () {

    const controls = L.DomUtil.get("slider");

    L.DomEvent.disableScrollPropagation(controls);
    L.DomEvent.disableClickPropagation(controls);

    return controls;

  }

  sliderControl.addTo(map);

})();