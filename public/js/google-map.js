var panorama, map;
var text_data=null;
var markers=[];
var find_index=null;
var prev_index=null;
var txtMoveFlag=0;
var audioElement;

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
var recognition = new SpeechRecognition();
var speechRecognitionList = new SpeechGrammarList();

var answer_codes=['1', '2', '3', '4'];

var grammar = '#JSGF V1.0; grammar answers; public <answer> = ' + answer_codes.join(' | ') + ' ;'
speechRecognitionList.addFromString(grammar, 1);
recognition.grammars = speechRecognitionList;
//recognition.continuous = false;
//he-IL |  Hebrew (Israel)
//recognition.lang = 'he-IL';
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

var recognizing=false;

var start_point=new google.maps.LatLng(32.010408,34.832764);

var icon_size=20;
var icon={
    url: "images/pano-location.png",
    scaledSize: new google.maps.Size(icon_size, icon_size), // scaled size
    origin: new google.maps.Point(0,0), // origin
    anchor: new google.maps.Point(parseInt(icon_size/2),parseInt(icon_size/2)), // anchor
    labelOrigin:new google.maps.Point(parseInt(icon_size/2),-10)
}
var star_icon={
    url: "images/star-location.png",
    scaledSize: new google.maps.Size(icon_size, icon_size), // scaled size
    origin: new google.maps.Point(0,0), // origin
    anchor: new google.maps.Point(parseInt(icon_size/2),parseInt(icon_size/2)), // anchor
    labelOrigin:new google.maps.Point(parseInt(icon_size/2),-10)
}

$(document).ready(function(){
   audioElement = document.createElement('audio');
   $("a.previous").click(function(){
       $("a.next").show();
       prev_index=find_index;
       if(find_index>0){
           txtMoveFlag=1;
           find_index--;
           if(find_index==0){
              $(this).hide();
           }
       }
       google.maps.event.trigger(markers[find_index], 'click');
   });
   $("a.next").click(function(){
        $("a.previous").show();
        prev_index=find_index;
        if(find_index<markers.length-1){
           txtMoveFlag=1;
           find_index++;
           if(find_index==markers.length-1){
             $(this).hide();
           }
        }
        google.maps.event.trigger(markers[find_index], 'click');
   });
   $(document).on('click','div.answer',function(){
      var select_index=$(this).parent().children().index(this);
      var answer=markers[find_index].attributes.answers[select_index];
      var right_answer=markers[find_index].attributes.right_answer;
      var answers=markers[find_index].attributes.answers;
      if(answer==right_answer){
         audioElement.setAttribute('src', 'audio/Effects.mp3');
         audioElement.play();
         $(this).removeClass("normal");
         $(this).addClass("right");
         $(".story-content").html(markers[find_index].attributes.text);
         setTimeout(function(){
            for(var i=0;i<answers.length;i++){
               if(i!=select_index){
                 $('div.answer:eq('+i+')').hide();
               }
            } 
            $(".story-box").slideDown(500);
            if(markers[find_index].attributes.voice_url==""){
               responsiveVoice.speak(markers[find_index].attributes.text, "US English Female");
            }else{
               audioElement.setAttribute('src', markers[find_index].attributes.voice_url);
               audioElement.play();
            }
         },1000);
      }else{
         $(this).removeClass("normal");
         $(this).addClass("wrong");
      }
   });
});
function initMap() {
    mapOptions={
        center: start_point,
        zoom: 12,
        minZoom: 7,
        //maxZoom: 10,
        zoomControl: false,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.SMALL,
            position: google.maps.ControlPosition.LEFT_BOTTOM
        },
        mapTypeControl:false,
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP,google.maps.MapTypeId.SATELLITE,google.maps.MapTypeId.HYBRID,google.maps.MapTypeId.TERRAIN],
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,  // HORIZONTAL_BAR DROPDOWN_MENU
            position: google.maps.ControlPosition.TOP_LEFT
        },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        fullscreenControl: true,
        streetViewControl: true,
        streetViewControlOptions:{
          position: google.maps.ControlPosition.LEFT_BOTTOM
        }
        //overviewMapControl:true,
        //disableDefaultUI: true
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById('street-view'), {
            position: start_point,
            pov: {
                heading: 34,
                pitch: 10
            },
            zoomControl:false,
            addressControl: false,
            fullscreenControl:false,
            navigationControl:true,
            panControl: false,
            //panControlOptions:{ position: }
            //enableCloseButton: true
            motionTracking: true,
            motionTrackingControl: true,
    });

    map.setStreetView(panorama);
    //pano_changed, pov_changed, links_changed, visible_changed
    panorama.addListener('position_changed', function() {
        //var pano_id=panorama.getPano();
        //var location=panorama.getPosition();
        map.setCenter(panorama.getPosition());
        if(txtMoveFlag==0){
           setText();
        }else{
           txtMoveFlag=0;
           displayText();
        }

    });
    google.maps.event.addListener(map, 'idle', function(){
       var zoom=map.getZoom();
       if(zoom>8){
           for(var i=0;i<markers.length;i++){
               if(map.getBounds().contains(markers[i].getPosition())){
                  markers[i].setMap(map);
               }else{
                  markers[i].setMap(null);
               }
           }
       }else{
           for(var i=0;i<markers.length;i++){
              markers[i].setMap(null);
           }
       }
    });
    //setDatabase();
    load_data();
}
function load_data(){
    firebase.database().ref('places').once('value', function(json) {
        var data=json.val();
        for (var key in data) {
            var lat=parseFloat(data[key]["lat"]);
            var lng=parseFloat(data[key]["lon"]);
            var point=new google.maps.LatLng(lat,lng);
            // Create a marker for each place.
            var marker=new google.maps.Marker({
                map: map,
                position: point,
                icon: icon,
                attributes:{
                   place_name: data[key]["place"],
                   question: data[key]["question"],
                   answers: [],
                   right_answer: data[key]["right_answer"],
                   text: data[key]["story"],
                   voice_url: data[key]["voice"]
                }
            });
            if(data[key]["answers"]!=""){
               marker.attributes.answers=data[key]["answers"];
            }
            addMarkerEvent(marker);
            markers.push(marker);
            markers.sort(function(a,b){
                return a.getPosition().lat()-b.getPosition().lat();
            });
        }
        
        google.maps.event.trigger(panorama, 'position_changed');

    });
}
function addMarkerEvent(marker){
   google.maps.event.addListener(marker, 'click', function(){
       var sv = new google.maps.StreetViewService();
       sv.getPanorama({location: marker.getPosition(), radius: 50}, function(data,status){
          if (status === 'OK') {
             var pano_id=data.location.pano;
             panorama.setPano(pano_id);
             panorama.setVisible(true);
          }else{
            sv = new google.maps.StreetViewService();
            sv.getPanorama({location: marker.getPosition(), radius: 300}, function(data,status){
                if (status === 'OK') {
                     var pano_id=data.location.pano;
                     panorama.setPano(pano_id);
                     panorama.setVisible(true);
                 }else{
                     audioElement.pause();
                     responsiveVoice.cancel();
                     $(".text-box").hide();
                 }
            });
          }
       });
   });
}
function setText(){
  var pano_point=panorama.getPosition();
  var min_distance=0;
  prev_index=find_index;
  for(var i=0;i<markers.length;i++){
     var point=markers[i].getPosition();
     var distance = google.maps.geometry.spherical.computeDistanceBetween(pano_point, point);
     if(i==0){
       min_distance=distance;
       find_index=0;
     }else{
       if(distance<min_distance){
          min_distance=distance;
          find_index=i;
       }
     }
  }
  if(min_distance>300){
    audioElement.pause();
    responsiveVoice.cancel();  
    if(prev_index!=null)markers[prev_index].setIcon(icon);
    prev_index=null;
    find_index=null;
    $(".text-box").hide();
  }else{
    if(prev_index==find_index) return;
    displayText();
  }
}
function displayText(){
    //$(".text-box").hide();
    audioElement.pause();
    audioElement.setAttribute('src', 'audio/Effects.mp3');
    audioElement.play();
    responsiveVoice.cancel();

    if(prev_index!=null) markers[prev_index].setIcon(icon);
    markers[find_index].setIcon(star_icon);
    $(".story-box").slideUp(500);
    if(find_index==0){
      $("a.previous").hide();
    }else{
      $("a.previous").show();
    }
    if(find_index==markers.length-1){
      $("a.next").hide();
    }else{
      $("a.next").show();
    }
    if(markers[find_index].attributes.question==""){
       $(".question-box").html(markers[find_index].attributes.place_name);
    }else{
       $(".question-box").html(markers[find_index].attributes.question);
    }
    var answers=markers[find_index].attributes.answers;
    if(answers.length==0){
        $(".text-box").show();
        $(".answer-box").html("");
        $(".story-content").html(markers[find_index].attributes.text);
        recognition.stop();
        $(".story-box").slideDown(500);
        if(markers[find_index].attributes.voice_url==""){
            responsiveVoice.speak(markers[find_index].attributes.text, "US English Female");
         }else{
            audioElement.setAttribute('src', markers[find_index].attributes.voice_url);
            audioElement.play();
         }
    }else{
        var content=[];
        for(var i=0;i<answers.length;i++){
           var number=i+1;
           content.push('<div class="answer normal">'+number+'. '+answers[i]+'</div>');
        }
        $(".answer-box").html(content.join(''));
        $(".text-box").show();
        if(recognizing==false) recognition.start();
    }
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

recognition.onresult = function(event) {
    var last = event.results.length - 1;
    var answer_code = event.results[last][0].transcript;
    //console.log(answer_code);
    var answers=markers[find_index].attributes.answers;
    var right_answer=markers[find_index].attributes.right_answer;
    // index
    var index=answer_codes.indexOf(answer_code);
    if(index==-1) {
        setTimeout(function(){
            if(recognizing==false) recognition.start();
        },1000);
        return;
    }    
    if(answers[index]==right_answer){
        audioElement.setAttribute('src', 'audio/Effects.mp3');
        audioElement.play();
        $('div.answer:eq('+index+')').removeClass("normal");
        $('div.answer:eq('+index+')').addClass("right");
        $(".story-content").html(markers[find_index].attributes.text);
        recognition.stop();
        setTimeout(function(){
            for(var i=0;i<answers.length;i++){
              if(i!=index){
                $('div.answer:eq('+i+')').hide();
              }
            }
            $(".story-box").slideDown(500);
            if(markers[find_index].attributes.voice_url==""){
                responsiveVoice.speak(markers[find_index].attributes.text, "US English Female");
             }else{
                audioElement.setAttribute('src', markers[find_index].attributes.voice_url);
                audioElement.play();
             }
        },2000);
    }else{
        $('div.answer:eq('+index+')').removeClass("normal");
        $('div.answer:eq('+index+')').addClass("wrong");
    }
}

recognition.onstart = function () {
    recognizing = true;
};

recognition.onend = function () {
    recognizing = false;
};

recognition.onerror = function(event) {
    setTimeout(function(){
        if(recognizing==false) recognition.start();
    },1000);
}

recognition.onspeechend = function() {
    recognition.stop();
    setTimeout(function(){
        if(recognizing==false) recognition.start();
    },1000);
}
  
recognition.onnomatch = function(event) {
    setTimeout(function(){
        if(recognizing==false) recognition.start();
    },1000);
}
  
google.maps.event.addDomListener(window, 'load', initMap);
