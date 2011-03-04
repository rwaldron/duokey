(function ( global, Math ) {
  
  var doc = global.document, 
  
  //  Minor method lookup performance improvement
  ceil = Math.ceil, 
  
  //  Inspired by Underscore.js's _.range(), only...
  //  deliriously fast in Chrome: http://jsperf.com/range-vs-range
  range = function(start, stop, step) {
    var start = start || 0,
        stop  = stop || start || 0,
        step  = step || 1,
        len   = ceil( (stop - start) / step) || 0 ,
        idx   = 0,
        range = [];
    
    range.length = len;
    
    while ( idx < len ) {
      range[ idx++ ] = start;
      start += step;
    }
    return range;
  },  
  //  http://130.113.54.154/~monger/hsl-rgb.html
  rgbHue = function( r, g, b ){
    
    //  Convert to 0-1 range
    r /= 255, g /= 255, b /= 255;
    
    //  Determine the max/min values 
    var max = Math.max( r, g, b ), 
        min = Math.min( r, g, b ), 
        lum = ( max + min ) / 2, 
        hue, sat, 
        delta;

    //  Return for black, white, gray values
    if ( max === min ) {
      return {
        H: 0, 
        S: 0, 
        L: lum
      };
    }

    delta = max - min;
    
    sat = delta / ( lum > 0.5 ? 2 - max - min : max + min );
    
    
    if ( max === r ) {
      hue = ( g - b ) / delta + ( g < b ? 6 : 0 ); 
    }

    if ( max === g ) {
      hue = ( b - r ) / delta + 2; 
    }

    if ( max === b ) {
      hue = ( r - g ) / delta + 4; 
    }  

    
    return {
      //  Scale conversion to integer  
      H: hue * 60, 
      S: sat * 100, 
      L: lum * 100
    };    
  }, 
  nodeData = {
    video : {
      ready: "readyState",
      load: "loadedmetadata",  //loadeddata
      width: "videoWidth", 
      height: "videoHeight", 
      action: "throttle"
    },
    img : {
      ready: "complete", 
      load: "load", 
      width: "width", 
      height: "height",
      action: "process"
    }
  },
  keyData = {
    green: [ 0, 255, 0 ],
    blue: [ 50, 70, 135 ],
    white: [ 255, 255, 255 ]
  },
  hueData = {
    green: range( 59, 159 ), 
    blue: range( 160, 260 ), 
    //white: [ 0 ]
    white: range( 0, 50 )
  };  

  function DuoKey( id, options ) {

    //  Store ref to `this` context
    var self = this;
    
    options = options || {};
    
    //  Store a ref to the media element - needs better checks
    this.media = doc.getElementById( id ) || doc.getElementsByTagName( id )[0] ;
    
    
    this.hslSets = [];
    this.hueSets = [];
    this.keySets = [];
    
    for ( var i = 0; i < options.match.length; i++ ) {
      
      var temp = rgbHue.apply( null, options.match[ i ] );
      
      this.hslSets.push( temp );
      this.hueSets.push( ceil( temp.H ) );

      for ( var prop in hueData ) {
        //  Find the hue within this hue data set to select correct set
        if ( hueData[ prop ].indexOf( ceil( temp.H ) ) > -1  ) {
          this.keySets.push( prop );
        }
      }    
    }
    
    //  Output scaling
    this.scale = options.scale || 1;
    
    //  GUID
    this.guid = +new Date();
    
    //  Media node type
    this.type = this.media.nodeName.toLowerCase();
    
    //  Node specific properties
    this.data = nodeData[ this.type ];
    
    //  Raw caching for last frame data
    this.last = [];


    this.replacements = [];

    
    
    var initMedia = function() {

      //  Store a ref to the video element dimensions
      self.width = ( options.width || self.media.width || self.media[ self.data.width ] ) * self.scale;
      self.height = ( options.height || self.media.height ||self.media[ self.data.height ] ) * self.scale; 
      

      for ( var i = 0; i < options.replace.length; i++ ) {
        
        (function ( i ) {
          
          var img = document.createElement( "img" );
            
          img.width = self.width;
          img.height = self.height;
          
          img.onload = function() {

            var ref = self.canvas( "duo-key-" + i ), 
                ctx = ref.getContext("2d"), 
                frame;
            
            //ref.style.display = "none";
            
            //  Draw current video frame
            ctx.drawImage( img, 0, 0, self.width, self.height );

            //  Return current 32-bit CanvasPixelArray data
            self.replacements[ i ] = ctx.getImageData( 0, 0, self.width, self.height );
          }

          img.src = options.replace[ i ];

          img.style.display = "none";

          self.media.parentNode.appendChild( img );
        
        })( i );
      }

      //  Create canvases, auto-id unless provided
      self.reference = self.canvas( options.reference || "chroma-ref-" + self.guid );
      self.chromakey = self.canvas( options.chromakey || "chroma-chr-" + self.guid );

      //  Stash the reference canvas
      self.reference.style.display = "none";

      //  Store refs to canvas contexts
      self.referenceContext = self.reference.getContext("2d");
      self.chromakeyContext = self.chromakey.getContext("2d");

      //  Polling for readyness of the replacement media
      function isInitialized() {
        
        if ( self.replacements.length === options.match.length ) {

          //  If just an image, then process immediately
          if ( self.data.action === "process" ) {

            self.process();

          } else {

            //  Throttling 
            self.timeout = options.timeout || 0;        

            //  Register listener to handle playback rendering
            self.media.addEventListener( "play", function() {

              //  Call the processing throttler
              self.throttle();

            }, false);  
          }        
        } else {
          
          setTimeout(function() {
            
            isInitialized();
            
          }, 0 );
        }
      }
      
      
      isInitialized();
      
    };
    
    //  Media exists
    if ( this.media ) {
      
      //  Media is ready to process
      if ( this.media[ this.data.ready ] ) {
      
        initMedia();
      
      //  Media is not ready, listen for readyness
      } else {
      
        this.media.addEventListener( this.data.load , initMedia, false);
      
      }
    }
    
    return this;
  }

  DuoKey.prototype.canvas = function( id ) {
    
    var canvas = doc.createElement("canvas");
    
    this.media.parentNode.appendChild( canvas );
    
    canvas.id = id;
    canvas.width = this.width;
    canvas.height = this.height;    
    
    return canvas;
    
  };
 
  DuoKey.prototype.throttle = function() {
    
    
    //  Return immediately if paused/ended
    if ( this.media.paused || this.media.ended ) {
      return;
    }
    
    //  Process the current scene
    this.process();
    
    //  Store ref to `this` context
    var self = this;
    
    //  The actual throttling is handled here, 
    //  throttle set to 20 fps
    setTimeout(function () {
      
      //  Recall the processing throttler
      self.throttle();

    }, this.timeout );
  };
  
  
  DuoKey.prototype.process = function() {
      
    var width = this.width, 
        height = this.height,
        ceils = [], 
        modified = [], 
        last, frame, frameLen, r, g, b, idx, hsl, hueIdx, frameData;
    
    
    //  Draw current video frame
    this.referenceContext.drawImage( this.media, 0, 0, width, height );

    //  Return current 32-bit CanvasPixelArray data
    frame = this.referenceContext.getImageData( 0, 0, width, height );

    //  Cache the length of the current frame.data ( CanvasPixelArray )
    frameLen = frame.data.length;
    
    //  Reference last frame raw, allows us to speed up pixel writing
    //  by skipping pixels that havent changed
    last = this.last;
    
    //  Each "frame" populates 4 indices of the ImageData/
    //  CanvasPixelData array, representing R, G, B, A
    for ( var i = 0; i < this.keySets.length; i++ ) {
      
      var swap = this.replacements[ i ].data, 
          key = this.keySets[ i ];

      //  Iterate sets of 4 pixel indices this frame  
      for ( idx = 0; idx < frameLen; idx = idx + 4 ) {
      

        //  Get HSL for this pixel
        testHsl = rgbHue( frame.data[ idx + 0 ], 
                          frame.data[ idx + 1 ], 
                          frame.data[ idx + 2 ] 
                          );

        hueIdx = hueData[ key ].indexOf( ceil( testHsl.H ) );


        if ( hueIdx > -1 ) {

          //  Setting the pixel's `alpha` value to 0 will result in transparency
          //  frame.data[ idx + 3 ] = hueIdx / hueData[ this.key ].length;

          //if ( testHsl.S  >= this.hsl.S - 10 && testHsl.L >= this.hsl.L - 10  ) {// && hsl.L < 75
          if ( testHsl.S > 25 && testHsl.L > 1 ) {

            frame.data[ idx + 0 ] = swap[ idx + 0 ];
            frame.data[ idx + 1 ] = swap[ idx + 1 ];
            frame.data[ idx + 2 ] = swap[ idx + 2 ];
            frame.data[ idx + 3 ] = swap[ idx + 3 ];

          }
        }
      }
    }
    
    this.last = frame.data;
    
    //  Draw back to the chroma canvas
    this.chromakeyContext.putImageData( frame, 0, 0 );

  };


  //  Expose API
  global.duoKey = function( id, options ) {
    return new DuoKey( id, options );
  }
  

})( this, Math );
