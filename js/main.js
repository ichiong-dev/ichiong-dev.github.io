var map;
var autocomplete;
var cebuCoordinates = { lat: 10.3157, lng: 123.8854 };
var infoWindow;
var directionsRenderer;
var directionsService;
var markers = [];
var currLocation;
var dataById = {};
var circle;
var drawingManager;

// initMap function
var initMap = function(){
  // style to remove unnecessary markers
  var myStyles =[
      {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
      }
  ];
  // create google map instance
  map = new google.maps.Map(document.getElementById("map"), {
    center: cebuCoordinates,
    zoom: 15,
    styles: myStyles
  });
  //retrieve JSON data of restaurants in CEBU
  const script = document.createElement("script");
  script.src = "restaurants.js";
  document.getElementsByTagName("head")[0].appendChild(script);

  // add listener in map for click event
  map.addListener('click', function(){
    //remove infowindows open
    if(infoWindow)
      infoWindow.close();
  });

  //search function
  $('#filterType').on('change',function(){
    deleteMarkers();
    if(infoWindow)
      infoWindow.close();
    //if zoomed out, zoom in to CEBU
    if(map.getZoom()<15){
      map.setZoom(15);
      map.setCenter(cebuCoordinates);
    }
    //Search by ID from map, if filtertype = type in places, display MARKER
    $(Object.keys(dataById)).each(function(index,object){
      if(dataById[object].type.includes($('#filterType').val().toLowerCase())){
        addMarker(dataById[object],false);
      }
    });

    if($('#filterType').val() == '')
      $('#showRestaurants').click();
  });

  //show restaurants again
  $('#showRestaurants').on('click',function(){
    //used if markers are gone, i.e. when using directions and circle search
    clearRestaurantDetails();
    $('#filterType').val('');
    deleteMarkers();
    //easy display for markers, iterate through ids
    $(Object.keys(dataById)).each(function(index,data){
      addMarker(dataById[data],false);
    });
  });

  //drawCircle
  $('#drawCircle').on('click',function(){
    clearRestaurantDetails();
    $('#filterType').val('');
    deleteMarkers();

    // DRAWING PROCESS
    drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.CIRCLE,
    drawingControl: false,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [
        google.maps.drawing.OverlayType.CIRCLE
      ]
    },
    circleOptions: {
      fillOpacity: 0,
      strokeWeight: 1,
      clickable: false,
      editable: false,
      zIndex: 1
    }
  });
  //set map to draw circle
  drawingManager.setMap(map);

  // after drawing, plot the restaurants within circle
  google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {
    //store value of circle, to clear later, to avoid many circles
    circle = e.overlay;
    // iterate through data
    $(Object.keys(dataById)).each(function(index,data){
      // set LatLng object for location of objects
      var path = (new google.maps.LatLng(dataById[data].location.lat,dataById[data].location.lng));
      //use computeDistanceBetween in geometry.spherical if within bounds display marker
      if (google.maps.geometry.spherical.computeDistanceBetween(path, circle.getCenter()) <= circle.getRadius()) {
        addMarker(dataById[data],false);
      }
    });
    //after drawing circle disable drawing
    drawingManager.setDrawingMode(null);
  });

  });
}
// function to clear restaurant details
var clearRestaurantDetails = function(){
  $('div#restaurantDetails').prop('hidden',true);
  $('span#name').text('');
  $('span#address').text('');
  $('div#reviews').text('');
};

// function add visit
var addVisits = function(){
  //TODO: file writer? update visiting in restaurants
};

// function to get JSON from file
const res_callback = function (results) {
  for (var i = 0; i < results.length; i++){
    var id = results[i].id + "";
    //create marker per place
    addMarker(results[i]);
    //store results in a map with ID as key, and results as value
    //easy usage of data and search
    dataById[id] = results[i];
  }
};

//display info in left panel
var displayInfo = function(place){
  //display restaurant details
  $('div#restaurantDetails').prop('hidden',false);
  $('span#name').text(place.name);
  $('span#address').text(place.address);
  //iterate all reviews if existing
  if(place.reviews.length > 0){
  $('div#reviews').text('');
    $(place.reviews).each(function(index, review){
      var count = index+1;
      var text = count + ". " + review +"<br/>";
      $('div#reviews').append(text);
    });
  }
};

//function for creating markers
var addMarker = function(place,openInfoWindow){
  //build infowindow store to variable
  var html = constructInfoWindow(place);
  //create marker in map
  var marker = new google.maps.Marker({
        map: map,
        position: place.location
      });

  //add listener for markers for click event
  marker.addListener('click', function(){
    if(infoWindow)
      infoWindow.close();
    //set infowindow based on marker informations
    infoWindow = new google.maps.InfoWindow({
      content: html
    });
    infoWindow.open(map,marker);
    //onclick, also display info in left panel
    displayInfo(place);
  });

  markers.push(marker);
  //open infoWindow automatically, for directions feature
  if(openInfoWindow)
    infoWindow.open(map,marker);
};

//function to deletemarkers and map settings, like reset the map
var deleteMarkers = function(){
  if(directionsRenderer != null){
    directionsRenderer.setMap(null);
    currLocation.setMap(null);
  }
  if(circle != null)
    circle.setMap(null);
  if(drawingManager != null)
    drawingManager.setDrawingMode(null);
  $(markers).each(function(index,marker){
    marker.setMap(null);
  });
  markers = [];
}

//create marker for user location, because we suppressmarker for directions
var addMarkerOrigin = function(location){
  var marker = new google.maps.Marker({
        map: map,
        position: location
      });

  currLocation = (marker);
};

//get directions function
var getDirections = function(id){
  //delete markers and retrieve place info via info id
  deleteMarkers();
  var placeInfo = dataById[id];
  //resets routes
  if(directionsRenderer != null)
    directionsRenderer.setMap(null);
  //remove markers from routes. Inconsistent markers from location.
  var supressMarkerOpts = {
    suppressMarkers: true,
  };
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer(supressMarkerOpts);
  var placeCoordinates = placeInfo.location
  directionsRenderer.setMap(map);
  //html5, get current location
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
        (position) => {
          //set current location to a coordinate
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          //setup request for directionsService
          //request is with origin, destination and travel mode
          var request = {
            origin: pos,
            destination: placeCoordinates,
            //set to DRIVING as default, can be TRANSIT, WALKING
            travelMode: "DRIVING",
          };
          //add new marker for origin, user location.
          addMarkerOrigin(pos);
          //add marker for destination and open infowindow
          addMarker(placeInfo,true);

          directionsService.route(request, function(result, status) {
            if (status == 'OK') {
              directionsRenderer.setDirections(result);
            }
          });
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
};

// ZOOMIN if very far
var zoomIn = function(id){
  var placeInfo = dataById[id];
  if(map.getZoom()<15){
    map.setZoom(15);
    map.setCenter(placeInfo.location);
  }
}

//build INFOWINDOW information based on JSON
var constructInfoWindow = function(place){
  var breaker =  "<br/>";
  var name = "<b>" + place.name + "</b>" + breaker;
  var address = place.address + breaker;
  var bestSellers = "<b> Best Seller/s <b>"+ breaker +"<ul>";
  $(place.bestseller).each(function(index, food){
    bestSellers = bestSellers + "<li>" + food + "</li>";
  });
  bestSellers = bestSellers + "</ul>";
  var color = "green";
  var rating = place.rating;
  //color code ratings
  if(rating == 5.0){
    color = "gold";
  } else if(rating > 3.5){
    color = "green";
  } else if (rating > 2.5){
    color = "orange";
  } else {
    color = "red";
  }
  var ratingDisplay = "<b style='color:"+color+"'>"+place.rating+""+" &#9733;</b></br>";
  var directions = '<a onclick="javascript:getDirections('+place.id+')">Directions</a> ';
  // for directions, if user location is far, you can select to zoom in to your destination
  var zoom = '<a onclick="javascript:zoomIn('+place.id+')">Zoom</a>';
  return name + address + bestSellers + ratingDisplay + directions + zoom;
};


initMap();
