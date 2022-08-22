(function () {

  'use strict';

  adjustHeight();
  window.addEventListener("resize", adjustHeight);

  function adjustHeight() {
    const mapSize = document.querySelector("#map"),
      contentSize = document.querySelector("#content"),
      removeHeight = document.querySelector("#footer").offsetHeight,
      resize = window.innerHeight - removeHeight;

    if (window.innerWidth >= 768) {
      contentSize.style.height = `${resize}px`;
      mapSize.style.height = `${resize}px`;
    } else {
      contentSize.style.height = `${resize * 0.25}px`;
      mapSize.style.height = `${resize * 0.75}px`;
    }
  }

  const button = document.querySelector("#legend button")
  button.addEventListener("click", function () {
      const legend = document.querySelector(".leaflet-legend")
      legend.classList.toggle("show-legend")
  })

  // initialize map, centered on Kenya
  const map = L.map("map", {
    zoomSnap: 0.1,
    zoom: 16,
    center: [-0.23, 37.8],
    zoomControl: false,
    minZoom: 6,
    maxZoom: 9,
    maxBounds: L.latLngBounds([-6.22, 27.72], [5.76, 47.83]),
  });

  // mapbox API parameters
  const accessToken = `pk.eyJ1Ijoia3dzdGFuY2lsIiwiYSI6ImNrd2FwZjRpczJtMHQydm1uZjhuZWNkOXQifQ.VgrGOg4cPkG6FHAeOZPvMw`;
  const yourName = "kwstancil";
  const yourMap = "cl7413mcv002o14qs96ajg3y3";

  // request a mapbox raster tile layer and add to map
  L.tileLayer(`https://api.mapbox.com/styles/v1/${yourName}/${yourMap}/tiles/256/{z}/{x}/{y}?access_token=${accessToken}`, {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: "light-v10",
    accessToken: accessToken,
  }).addTo(map);

  // load CSV data
  omnivore.csv("data/kenya_education_2014.csv")
    .on("ready", function (e) {

      // send GeoJSON representation of data to drawMap and drawLegend
      drawMap(e.target.toGeoJSON());
      drawLegend(e.target.toGeoJSON());
    })

    .on("error", function (e) {
      // catch an error loading the data
      console.log(e.error[0].message);
    });

  function drawMap(data) {

    // universal options for two L.geoJson layergroups created below
    const options = {
      pointToLayer: function (feature, ll) {
        return L.circleMarker(ll, {
          opacity: 1,
          eight: 2,
          fillOpacity: 0
        });
      },
    };

    // create two separate layers from GeoJSON data
    const girlsLayer = L.geoJson(data, options).addTo(map),
      boysLayer = L.geoJson(data, options).addTo(map);

    // fit the bounds of the map to one of the layers
    map.fitBounds(girlsLayer.getBounds(), {
      padding: [50, 50]
    });

    // color the layers different colors
    girlsLayer.setStyle({
      color: getColor("girls"),
    });

    boysLayer.setStyle({
      color: getColor("boys"),
    });

    // resize the circles using attribute data from grade 1
    resizeCircles(girlsLayer, boysLayer, 1);

    // activate listeners for using the slider UI
    sequenceUI(girlsLayer, boysLayer);

  } // end drawMap()

  function drawLegend(data) {

    // create Leaflet control for the legend
    const legend = L.control({
      position: "bottomright"
    });

    // when the control is added to the map
    legend.onAdd = function (map) {
      // select the element with id attribute of 'legend'
      const div = L.DomUtil.get("legend");

      // disable scroll and click functionality
      L.DomEvent.disableScrollPropagation(div);
      L.DomEvent.disableClickPropagation(div);

      // add legend to the control
      return div;
    }

    // add control to map
    legend.addTo(map);

    // loop through all features (i.e., schools)
    const dataValues = [];

    data.features.forEach(function (school) {
      // for each grade in a school
      for (let grade in school.properties) {
        // shorthand to each value
        const value = school.properties[grade];
        // if the value can be converted to a number
        if (+value) {
          // return the value to the array
          dataValues.push(+value);
        }
      }
    });

    console.log(dataValues);

    // sort array
    const sortedValues = dataValues.sort(function (a, b) {
      return b - a;
    });

    // round the highest number and use as large circle diameter
    const maxValue = Math.round(sortedValues[0] / 1000) * 1000;

    // calculate the diameters
    const largeDiameter = calcRadius(maxValue) * 2,
      smallDiameter = largeDiameter / 2;

    // create a function with a short name to select elements
    const $ = function (x) {
      return document.querySelector(x);
    };

    // select circles container and set height
    $(".legend-circles").style.height = `${largeDiameter.toFixed()}px`;

    // set width and height for large circle
    $(".legend-large").style.width = `${largeDiameter.toFixed()}px`;
    $(".legend-large").style.height = `${largeDiameter.toFixed()}px`;

    // set width and height for small circle and position
    $(".legend-small").style.width = `${smallDiameter.toFixed()}px`;
    $(".legend-small").style.height = `${smallDiameter.toFixed()}px`;
    $(".legend-small").style.top = `${largeDiameter - smallDiameter - 2}px`;
    $(".legend-small").style.wleft = `${smallDiameter / 2}px`;

    // label the max and half values
    $(".legend-large-label").innerHTML = `${maxValue.toLocaleString()}`;
    $(".legend-small-label").innerHTML = (maxValue / 2).toLocaleString();

    // adjust the position of the large based on size of circle
    $(".legend-large-label").style.top = `${-11}px`;
    $(".legend-large-label").style.left = `${largeDiameter + 30}px`;

    // adjust the position of the small based on size of circle
    $(".legend-small-label").style.top = `${smallDiameter - 13}px`;
    $(".legend-small-label").style.left = `${largeDiameter + 30}px`;

    // insert a couple of hr elements and use them to connect value label to top of each circle
    $("hr.small").style.top = `${largeDiameter - smallDiameter - 10}px`;

  } // end drawLegend()

  function resizeCircles(girlsLayer, boysLayer, currentGrade) {

    // loop through the layers, calculate and set the radius for each feature
    girlsLayer.eachLayer(function (layer) {
      let radius = calcRadius(Number(layer.feature.properties["G" + currentGrade]));
      layer.setRadius(radius);
    });
    boysLayer.eachLayer(function (layer) {
      let radius = calcRadius(Number(layer.feature.properties["B" + currentGrade]));
      layer.setRadius(radius);
    });

    // update the hover window with current grades
    retrieveInfo(boysLayer, currentGrade);

  } // end resizeCircles()

  function calcRadius(value) {
    // takes a numeric value and calculates a radius for circleMarkers
    const radius = Math.sqrt(value / Math.PI);
    return radius * .5; // adjust .5 as a scale factor

  } // end calcRadius ()

  function sequenceUI(girlsLayer, boysLayer) {

    // create Leaflet control for the slider
    const sliderControl = L.control({
      position: "bottomleft"
    });

    // when the control is added to the map
    sliderControl.onAdd = function (map) {
      // select the slider using id attribute of slider
      const controls = L.DomUtil.get("slider");

      // disable scroll and click functionality
      L.DomEvent.disableScrollPropagation(controls);
      L.DomEvent.disableClickPropagation(controls);

      // return the selection
      return controls;
    }

    sliderControl.addTo(map);

    // create Leaflet control for the current grade output
    const gradeControl = L.control({
      position: "topleft"
    });

    // select the slider
    const slider = document.querySelector("#slider input");
    // select the slider's input and listen for change
    slider.addEventListener("input", function (e) {
      // current value of slider is current grade level
      var currentGrade = e.target.value;

      // resize the circles with updated grade level
      resizeCircles(girlsLayer, boysLayer, currentGrade);

      //update output
      output.innerHTML = currentGrade;
    });

  } // end sequenceUI()

  function retrieveInfo(boysLayer, currentGrade) {
    // select the element and reference with variable
    // and hide it from view initially
    const info = document.querySelector("#info");

    // since boysLayer is on top, use to detect mouseover events
    boysLayer.on("mouseover", function (e) {

      // remove the none class to display and show
      // info.classList.toggle('show-info')
      info.style.display = "block";

      // access properties of target layer
      const props = e.layer.feature.properties;

      // create a function with a short name to select elements
      const $ = function (x) {
        return document.querySelector(x);
      };

      // populate HTML elements with relevant info
      $('#info span').innerHTML = props.COUNTY;
      $(".girls span:first-child").innerHTML = `(grade ${currentGrade})`;
      $(".boys span:first-child").innerHTML = `(grade ${currentGrade})`;
      $(".girls span:last-child").innerHTML = Number(props[`G${currentGrade}`]).toLocaleString();
      $(".boys span:last-child").innerHTML = Number(props[`B${currentGrade}`]).toLocaleString();

      // raise opacity level as visual affordance
      e.layer.setStyle({
        fillOpacity: .6,
      });

      // create empty arrays to store all values for grades
      const girlsValues = [],
            boysValues = [];

      // push values to arrays
      for (let i = 1; i <= 8; i++) {
        girlsValues.push(Number(props["G" + i]));
        boysValues.push(Number(props["B" + i]));
      }

      const girlsOptions = {
        id: "girlspark",
        width: 280,
        height: 50,
        color: getColor("girls"),
        lineWidth: 3,
      }

      sparkLine(girlsValues, girlsOptions, currentGrade)

      const boysOptions = {
        id: "boyspark",
        width: 280,
        height: 50,
        color: getColor("boys"),
        lineWidth: 3,
      }

      sparkLine(boysValues, boysOptions, currentGrade)

    });

    // hide info panel when mousing off layergroup and remove affordance capacity
    boysLayer.on("mouseout", function (e) {
      info.style.display = "none";
      e.layer.setStyle({
        fillOpacity: 0,
      });
    });

    // unset any position properties when window is resized
    window.addEventListener("resize", function () {
      info.style.right = 'unset'
      info.style.top = 'unset'
      info.style.left = 'unset'
    })

    document.addEventListener("mousemove", function (e) {

      if (window.innerWidth < 768) {
        info.style.right = "10px";
        info.style.top = `${window.innerHeight * 0.25 + 5}px`;
      } else {
        (info.style.left = `${e.pageX + 6}px`),
        (info.style.top = `${e.pageY - info.offsetHeight - 25}px`);

        if (e.pageX + info.offsetWidth > window.innerWidth) {
          info.style.left = `${e.pageX - info.offsetWidth - 6}px`;
        }

        if (e.pageY - info.offsetHeight - 25 < 0) {
          info.style.top = `${e.pageY +6}px`;
        }
      }
    });
  } // end retrieveInfo()

  function getColor(x) {
    //access the fourth stylesheet referenced in the HTML head element
    const stylesheet = document.styleSheets[3];
    const colors = []
    console.log(stylesheet.cssRules)

    // loop through the rules in the stylesheet
    for (let i of stylesheet.cssRules) {
      // when we find girls, add its color to an array
      if (i.selectorText === ".girls") {
        colors[0] = i.style.backgroundColor;
      }
      if (i.selectorText === ".boys") {
        colors[1] = i.style.backgroundColor;
      }
    }

    // if function was given 'girls' return that color
    if (x == "girls") {
      return colors[0]
    } else {
      return colors [1]
    }
  } // end getColor()

  function sparkLine(data, options, currentGrade) {

    d3.select(`#${options.id} svg`).remove();

    const w = options.width,
      h = options.height,
      m = {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5,
      },
      iw = w - m.left - m.right,
      ih = h - m.top - m.bottom,
      x = d3.scaleLinear().domain([0, data.length]).range([0, iw]),
      y = d3.scaleLinear().domain([d3.min(data), d3.max(data)]).range([ih, 0]);

    const svg = d3.select(`#${options.id}`).append("svg")
      .attr("width", w)
      .attr("height", h)
      .append("g")
      .attr("transform", `translate(${m.left},${m.top})`);

    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d));

    const area = d3.area()
        .x((d, i) => x(i))
        .y0(d3.min(data))
        .y1(d => y(d));

    svg.append("path")
      .datum(data)
      .attr("stroke-width", 0)
      .attr("fill", options.color)
      .attr("opacity", 0.5)
      .attr("d", area);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", options.color)
      .attr("stroke-width", options.lineWidth)
      .attr("d", line);

    svg.append("circle")
      .attr("cx", x(Number(currentGrade) - 1))
      .attr("cy", y(data[Number(currentGrade) - 1]))
      .attr("r", "4px")
      .attr("fill", "white")
      .attr("stroke", options.color)
      .attr("stroke-width", options.lineWidth / 2);

  } // end sparkLine()

})(); // end function()
