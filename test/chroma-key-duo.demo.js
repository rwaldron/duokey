document.addEventListener( "DOMContentLoaded", function() {
  
  
  duoKey( "tunic-duo", {
    
    scale: .5, 
    
    match: [
      [ 50, 70, 135 ],
      [ 75, 228, 77 ]
      
    ], 
    replace: [
      "assets/under-water.jpg",
      "assets/outer-space.jpg"
    ]
  });
  
  
  duoKey( "okgo", {
    
    scale: .75, 
    
    match: [
      [ 50, 70, 135 ],
      [ 255, 255, 255 ]
      
    ], 
    replace: [
      "assets/under-water.jpg",
      "assets/outer-space.jpg"
    ]
  }); 
  
  
}, false);