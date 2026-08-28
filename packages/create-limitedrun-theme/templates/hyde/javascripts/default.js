// Cart Totals
var cartTotal = (function () {
  var numberToCurrency = function (d) {
    return '£' + d.toFixed(2).toString();
  };
  
  return {
    cartCallback: function (data) {
      $('.cart-count').text(data.items.length || 0);
      $('.cart-total').text(numberToCurrency(data.subtotal));
    }
  };
})();

var StoreConfig = { cartCallback: cartTotal.cartCallback };

$(function() {
  $('#cart_variation_id').change(function() {
    if ($('#default').is(':selected')) {
      $('.add-to-cart').addClass('disabled');
    } else {
      $('.add-to-cart').removeClass('disabled');
    }
  }).trigger('change');
});

$(document).ready(function(){
  {% if config['sticky_navigation'] %}
    $(window).scroll(function() {
      if ($(this).scrollTop() > {% if config['show_top_bar'] %}40{% else %}0{% endif %}){  
        $('.main-nav').addClass("sticky");
        $('body').addClass("nav-is-sticky");
      }
      else{
        $('.main-nav').removeClass("sticky");
        $('body').removeClass("nav-is-sticky");
      }
      {% if config['shrink_navigation_on_scroll'] %}
        if ($(this).scrollTop() > 100){  
          $('.main-nav').addClass("shrink");
        }
        else{
          $('.main-nav').removeClass("shrink");
        }
      {% endif %}
    });
  {% endif %}
  
  // Mobile Nav
  $('.nav-trigger').click( function(event){
    event.stopPropagation();
    $('.mobile-nav').toggleClass('open');
    $('body').toggleClass('nav-is-visible');
  });

  $(document).click( function(){
    $('.mobile-nav').removeClass('open');
    $('body').removeClass('nav-is-visible');
  });
  
  // Search
  $('.search-trigger').on('click', function(event) {
    event.preventDefault();
    $('#search').addClass('open');
    $('#search > form > input[type="search"]').focus();
  });
    
  $('#search, #search .close').on('click keyup', function(event) {
    if (event.target == this || event.target.className == 'close' || event.keyCode == 27) {
      $(this).removeClass('open');
    }
  });
  
  // Gallery
  $('.image-gallery').lightGallery({
    showThumbByDefault: false
  });
  
  // Product Slider
  $('.slider').slick({
    arrows: false,
    fade: true,
    asNavFor: '.slider-thumbnails',
    adaptiveHeight: true
  });
  $('.slider-thumbnails').slick({
    slidesToShow: 5,
    asNavFor: '.slider',
    focusOnSelect: true
  });
  
  // Home Page Slider
  $('.carousel').slick({
    {% if config['featured_carousel_transition'] == 'fade' %}
      fade: true,
    {% endif %}
    prevArrow: '<a class="arrow-left"></a>',
    nextArrow: '<a class="arrow-right"></a>',
    adaptiveHeight: true,
    autoplay: true
  });
  
  $('#product-images').glassCase({
    widthDisplay: 900,
    heightDisplay: 900,
    isDownloadEnabled: false,
    colorLoading: '{{ config['accent_color'] }}',
    thumbsPosition: "{{ config['image_thumbnails'] }}",
    {% if config['zoom_image_on_hover'] %}
      isZoomDiffWH: true,
      zoomWidth: 400,
      zoomHeight: 400
    {% else %}
      isZoomEnabled: false
    {% endif %}
  });
  
  // Category Sliders
  $('.category-slider').slick({
    prevArrow: '<a class="slider-prev"><i class="fa fa-angle-left"></i></a>',
    nextArrow: '<a class="slider-next"><i class="fa fa-angle-right"></i></a>',
    slidesToShow: 4,
    slidesToScroll: 4,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2
        }
      }
    ]
  });
});