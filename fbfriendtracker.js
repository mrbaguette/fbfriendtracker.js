// ==UserScript==
// @name         My Fancy New Userscript
// @namespace    http://your.homepage/
// @version      0.1
// @description  enter something useful
// @author       You
// @match        https://www.facebook.com/tony.mrbaguette/friends
// @require http://code.jquery.com/jquery-latest.js
// @grant   GM_getValue
// @grant   GM_setValue
//==/UserScript==

function log(str) {
	if (typeof debug !== 'undefined') { debug(str); }
	if (typeof GM_log !== 'undefined') { GM_log(str); return true; }
	else if (typeof console !== 'undefined' && console.log) { console.log(str); return true; }
	return false;
}

function get_friend_list() {
	return $('div[id*="pagelet_timeline_app_collection"] a:not([class])').get() || [];
}

function get_inactive_friend_list() {
	return $('div[id*="pagelet_timeline_app_collection"] a[ajaxify*="inactive"]').get() || [];
}

function load_more_friends_rec(previous_loaded_friends_count) {
   if ($('h3:contains("More About Tony Baguette")').size()) {
       //all loaded
       window.scrollTo(0,0);
       sync_friends()
       return;
   }
    
    var loaded_friends_count = get_friend_list().length;
    
    if (previous_loaded_friends_count == loaded_friends_count) {
        //still loading...
        log("still loading...");
    }
    else {
        window.scrollTo(0,document.body.scrollHeight);     
    }
    setTimeout(function() {
       load_more_friends_rec(loaded_friends_count);
       //sync_friends()
       
    }, 500);
}


function load_all_friends() {
	load_more_friends_rec(get_friend_list().length);
}


var today = Date()

function friend_to_string(f) {
    return f.name + " last seen " + f.last_seen + " (" + f.fb_id + ") " + f.url;
}
function extract_friend_info(friend_node) {
    var name = friend_node.text;
    var url = friend_node.href;
    var old_fb_id_re = /https:\/\/www.facebook.com\/profile\.php\?id=([^&]+)/g
   	re_match = old_fb_id_re.exec(url)
    if (re_match == null) {
    	var fb_id_re = /https:\/\/www.facebook.com\/([^?]+)/g;
 		re_match = fb_id_re.exec(url)
    }
    var fb_id = null;
    if (re_match == null) {
        log("cannot find fb id in url=" + url)
    }
    else {
        fb_id = re_match[1];
    }
    return {
        "name": name,
        "url": url,
        "fb_id": fb_id
    }
}


function sync_friends() {
    var friend_list = get_friend_list();
    
    //delete friend_list[4]
    
    var friend_hash = {}
    var extracted_friend_info_list = friend_list.map(function(item) {
        var f = extract_friend_info(item)
        f["last_seen"] = new Date(f["last_seen"])
        
        if (f.fb_id in friend_hash) {
            log("warn: overwritting user, same id? " + friend_to_string(f) );   
        }
        friend_hash[f.fb_id] = f
        return f
    });
    
    log("fbfc detected " + extracted_friend_info_list.length + " friends")
    
    
    
    
    //fbfc = facebook friend checker
    var previous_db = GM_getValue("fbfc_db");
    
    var previous_friend_list
    if (previous_db == null) {
        //init
        log("fbfc init")
        alert("fbfc init");
        previous_friend_list = []
    }
    else {
        previous_friend_list = JSON.parse(previous_db).map(function(i) {
            i["last_seen"] = new Date(i["last_seen"])
            return i
        })
        
        log("fbfc loaded " + previous_friend_list.length + " friends")
    }
    
    var lost_friends = [];
    var new_friend_list = [];
    
    previous_friend_list.map(function(previous) {
        if (previous.fb_id in friend_hash) {
            var f = friend_hash[previous.fb_id];
            //add updated friend (last_seen)
            f["last_seen"] = today
            new_friend_list.push(f);
            delete friend_hash[previous.fb_id];
        }
        else {
            lost_friends.push(previous);
            //keep old friend info
            new_friend_list.push(previous);
        }
    });

    var new_friends_count = 0;
    
    for (fb_id in friend_hash) {
        var f = friend_hash[fb_id]
        f["last_seen"] = today
        log("new friend: " + friend_to_string(f));
        new_friend_list.push(f);
        new_friends_count += 1;
    }
    
    lost_friends.sort(function(a,b) {
        return a.last_seen.getTime() - b.last_seen.getTime()
    });
    
    lost_friends.map(function(f) {
        log("friend lost: " + friend_to_string(f));
    });
    
    alert("Lost friend: " + lost_friends.length + " New friends: " +  new_friends_count); 
    
    
    //make a bck in case (fb changes..)
    GM_setValue("fbfc_db_bck", previous_db);
    
    GM_setValue("fbfc_db", JSON.stringify(new_friend_list));
	log("fbfc saved " + new_friend_list.length + " friends")
    
}

load_all_friends();

