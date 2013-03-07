$(function() {
  
  $.get('/login',function(result) {
    $("#loginbox").html(result);
    $("#loginform").on('submit',function(e) {
      $("#loginerror").hide();
      e.preventDefault();
      $.post('/login',{
        username: $("#loginform input[name=username]").val(),
        password: $("#loginform input[name=password]").val()
      },function(result) {
        if(result==='false') {
          $("#loginerror").html("wrong username or password").fadeIn('fast');
        } else {
          location.reload();
        }
      });
      return false;
    });
  });
  
  // lang.jade stuff
  $("#changebtn").on('click',function() {
    $.post('/change',
      {
        to:$("input[name=lang]").val()
      },
      function(result) {
        if(result === 'failed') {
          $("#change .error").html("Could not change language to: "+$("input[name=lang]").val()+" <a href='/create?lang="+$("input[name=lang]").val()+"'>create it!</a>");
        } else if (result === 'success') {
          window.location.reload();
        } else {
          $("#change").html("Please choose a language: " + result);
        }
        // finally...
        $("input[name=lang]").val("");
      }
    );
  });
  
  
});
