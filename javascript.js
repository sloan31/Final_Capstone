
var map = L.map('map').setView([48.5087108, -122.6333888], 17);
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/satellite-v9',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1Ijoic2xvYW5tb29yZTMxIiwiYSI6ImNsYTM1anB5NzAxMmczb3BqcGlpMW9xeTYifQ.YwqRi3XLnVSFNFDmYvg9dw'
}).addTo(map);


// Create a custom control that includes buttons and a container for the text
var myControl = L.Control.extend({
    options: {
        position: 'topleft'
    },

    onAdd: function (map) {
        // Create a container for the control
        var container = L.DomUtil.create('div', 'my-control');

        // Create a button for the "Geolocation" feature and add it to the container
        var button = L.DomUtil.create('button', 'my-button', container);
        button.innerHTML = 'Start Geolocation';

        // Add a click event listener to the "Geolocation" button to start geolocation tracking
        L.DomEvent.addListener(button, 'click', startGeolocation);

        // Create a button for "Stop Geolocation" and add it to the container
        var stopButton = L.DomUtil.create('button', 'my-button', container);
        stopButton.innerHTML = 'Stop Geolocation';
        stopButton.style.display = 'none'; // Hide the button by default

        // Add a click event listener to the "Stop Geolocation" button to stop geolocation tracking
        L.DomEvent.addListener(stopButton, 'click', stopGeolocation);

        return container;
    }
});

// Add the custom control to the map
map.addControl(new myControl());

// feature group for lines
var pathItems = L.featureGroup().addTo(map);

// Global variable to hold the polyline
var userPath = L.polyline([], { color: 'blue' }).addTo(map);

var firstPosition = true;
var geolocationInterval;


function startGeolocation() {
    if (!navigator.geolocation) {
        console.log("browser not working");
    } else {
        geolocationInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(getPosition);
        }, 2000);
    }

    // Hide "Geolocation" button and show "Stop Geolocation" button
    document.querySelector('.my-button').style.display = 'none';
    document.querySelectorAll('.my-button')[1].style.display = 'block';
}

function getPosition(position) {
    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    var accuracy = position.coords.accuracy;

    // Update the polyline with the user's latest coordinates
    userPath.addLatLng([lat, long]);
    
    // console.log(position)
    // If it's the first position update, display marker and circle
    if (firstPosition) {
        map.setView([lat, long], 17);
        var marker = L.marker([lat, long]).addTo(map);
        var circle = L.circle([lat, long], { radius: accuracy }).addTo(map);
        firstPosition = false; // Set the flag to false after the first position update
    }
    // console.log(userPath);
    // console.log(drawnItems);
    
}

function stopGeolocation() {
    clearInterval(geolocationInterval);

    userPath.addTo(pathItems);
   
    // Show "Geolocation" button and hide "Stop Geolocation" button
    document.querySelector('.my-button').style.display = 'block';
    document.querySelectorAll('.my-button')[1].style.display = 'none';

    var pathItemsGeoJSON = pathItems.toGeoJSON();
    var geomfeatures = pathItemsGeoJSON.features;

    // Loop through the features to access each geometry
    for (var i = 0; i < geomfeatures.length; i++) {
        var feature = geomfeatures[i];
        var geometry = feature.geometry;

        // Now you can access the coordinates of the LineString
        var coordinates = geometry.coordinates;

        // Convert the geometry to a JSON string
        var pathJstring = JSON.stringify(geometry);

        console.log(geometry);
        console.log(coordinates);
        console.log(pathJstring);
    }
}



//   toolbar with shape, edit etc.
var drawnItems = L.featureGroup().addTo(map);



var tableData = L.layerGroup().addTo(map);
var url = "http://164.92.122.23:4000/sql?q=";
// change the Query below by replacing lab_7_name with your table name
var sqlQuery = "SELECT geom, description, name FROM map";
function addPopup(feature, layer) {
    layer.bindPopup(
        "<b>" + feature.properties.name + "</b><br>" +
        feature.properties.description
    );
}

fetch(url + sqlQuery)
    .then(function(response) {
    return response.json();
    })
    .then(function(data) {
        L.geoJSON(data, {onEachFeature: addPopup}).addTo(tableData);
    });


new L.Control.Draw({
    draw : {
        polygon : true,
        polyline : true,
        rectangle : true,     
        circle : true,        
        circlemarker : true,  
        marker: true
    },
    edit : {
        featureGroup: drawnItems
    }
}).addTo(map);
//  console.log(drawnItems)

//add this
function createFormPopup() {
    var popupContent = 
    '<form>' + 
    'Boulder Name:<br><input type="text" id="input_name"><br>' + 
    'Description:<br><input type="text" id="input_desc"><br>' + 
    '<input type="button" value="Submit" id="submit">' + 
    '</form>' 
    drawnItems.bindPopup(popupContent).openPopup();
}

//change the event listener code to this
map.addEventListener("draw:created", function(e) {
    e.layer.addTo(drawnItems);
    createFormPopup();
});

function setData(e) {
    if(e.target && e.target.id == "submit") {
        // Get user name and description
        var enteredUsername = document.getElementById("input_name").value;
        var enteredDescription = document.getElementById("input_desc").value;
       
         	// For each drawn layer
    drawnItems.eachLayer(function(layer) {
           
        // Create SQL expression to insert layer
        var drawing = JSON.stringify(layer.toGeoJSON().geometry);
        var sql =
            "INSERT INTO map (geom, name, description) " +
            "VALUES (ST_SetSRID(ST_GeomFromGeoJSON('" +
            drawing + "'), 4326), '" +
            enteredUsername + "', '" +
            enteredDescription + "');";
        console.log(sql);

        // Send the data
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "q=" + encodeURI(sql)
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log("Data saved:", data);
        })
        .catch(function(error) {
            console.log("Problem saving the data:", error);
        });

    // Transfer submitted drawing to the tableData layer 
    //so it persists on the map without you having to refresh the page
    var newData = layer.toGeoJSON();
    newData.properties.description = enteredDescription;
    newData.properties.name = enteredUsername;
    L.geoJSON(newData, {onEachFeature: addPopup}).addTo(tableData);

});
        // Clear drawn items layer
        drawnItems.closePopup();
        drawnItems.clearLayers();
    }
}
// determines which pop ups will be opened or closed 
document.addEventListener("click", setData);

map.addEventListener("draw:editstart", function(e) {
    drawnItems.closePopup();
});
map.addEventListener("draw:deletestart", function(e) {
    drawnItems.closePopup();
});
map.addEventListener("draw:editstop", function(e) {
    drawnItems.openPopup();
});
map.addEventListener("draw:deletestop", function(e) {
    if(drawnItems.getLayers().length > 0) {
        drawnItems.openPopup();
    }
});
