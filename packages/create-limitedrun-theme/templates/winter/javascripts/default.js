// Nav

var drawerIsOpen = false;
 
function openDrawer()
{
	$("aside").css("left", "0px");
	$("#toggle").css("width", "300px");
}
 
function closeDrawer()
{
	$("aside").css("left", "-300px");
	$("#toggle").css("width", "65px");
}	
 
function toggleDrawer()
{
	if(drawerIsOpen)
	{
		closeDrawer();
		drawerIsOpen = false;
	}
	else
	{
		openDrawer();
		drawerIsOpen = true;
	}
}

// Slider

$(document).ready(function(){
    $('.slider').slick({
      dots: true,
      arrows: false
    });
});