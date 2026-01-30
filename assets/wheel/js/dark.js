var _____WB$wombat$assign$function_____=function(name){return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name))||self[name];};if(!self.__WB_pmw){self.__WB_pmw=function(obj){this.__WB_source=obj;return this;}}{
let window = _____WB$wombat$assign$function_____("window");
let self = _____WB$wombat$assign$function_____("self");
let document = _____WB$wombat$assign$function_____("document");
let location = _____WB$wombat$assign$function_____("location");
let top = _____WB$wombat$assign$function_____("top");
let parent = _____WB$wombat$assign$function_____("parent");
let frames = _____WB$wombat$assign$function_____("frames");
let opens = _____WB$wombat$assign$function_____("opens");
$(document).ready(function(){
   
    const nightModeCookie = getCookie("night_mode");
    

    if (nightModeCookie === 'true') {
        $("html").addClass("dark");
    } else {
        $("html").removeClass("dark");
    }


    $(".dark-light").on("click", function(){
     
        $("html").toggleClass("dark");

        const newMode = $("html").hasClass("dark") ? 'true' : 'false';
        setCookie("night_mode", newMode, 30);
    });

    function setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
    }

    function getCookie(name) {
        const cookieArray = document.cookie.split(';');
        for (const cookie of cookieArray) {
            const keyValue = cookie.split('=');
            if (keyValue.length === 2) {
                const cookieName = keyValue[0].trim();
                const cookieValue = keyValue[1].trim();
                if (cookieName === name) {
                    return cookieValue;
                }
            }
        }
        return null;
    }
});

function showNav(){document.querySelector("nav").classList.toggle("active");document.querySelector(".nav-toggle").classList.toggle("active");}
}

