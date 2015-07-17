angular.module('visualFactory', ['firebase'])

.factory('Visualization', ['$firebaseArray', function ($firebaseArray){

	var visualFactory = {};

	var visualId = '';
	visualFactory.setName = function(name){
		visualId = name;
	};

	visualFactory.getName = function(){
		return visualId;
	};

	visualFactory.getMessages = function(name, org){
		var ref = new Firebase('https://bizgramer.firebaseio.com/'+org+'/visualizations');
		var messageRef = ref.child(name).child('messages');
		messages = $firebaseArray(messageRef);
		return messages;
	};

	visualFactory.addMessage = function(user, name, text, org){
		var ref = new Firebase('https://bizgramer.firebaseio.com/'+org+'/visualizations');
		var messageRef = ref.child(name).child('messages');
		messages = $firebaseArray(messageRef);
		messages.$add({
			username: user,
			text: text,
			createdAt: Firebase.ServerValue.TIMESTAMP
		});
	};

	var CustomTooltip = function(tooltipId, width) {

	  var showTooltip = function(content, event) {
	    $("#"+tooltipId).html(content);
	    $("#"+tooltipId).show();

	    updatePosition(event);
	  };
	  
	  var hideTooltip = function() {
	    $("#"+tooltipId).hide();
	  };

	  var updatePosition = function(event) {
	    var ttid = "#"+tooltipId;
	    var xOffset = 20;
	    var yOffset = 10;

	     var ttw = $(ttid).width();
	     var tth = $(ttid).height();
	     var wscrY = $(window).scrollTop();
	     var wscrX = $(window).scrollLeft();
	     var curX = (document.all) ? event.clientX + wscrX : event.pageX;
	     var curY = (document.all) ? event.clientY + wscrY : event.pageY;
	     var ttleft = ((curX - wscrX + xOffset*2 + ttw) > $(window).width()) ? curX - ttw - xOffset*2 : curX + xOffset;
	     if (ttleft < wscrX + xOffset){
	      ttleft = wscrX + xOffset;
	     }
	     var tttop = ((curY - wscrY + yOffset*2 + tth) > $(window).height()) ? curY - tth - yOffset*2 : curY + yOffset;
	     if (tttop < wscrY + yOffset){
	      tttop = curY + yOffset;
	     }
	     $(ttid).css('top', tttop + 'px').css('left', ttleft + 'px');
	  };
	  
	  $("#vis").append("<div class='tooltip' id='"+tooltipId+"'></div>");
	  
	  if(width){
	    $("#"+tooltipId).css("width", width);
	  }
	  
	  hideTooltip();

	  return {
	    showTooltip: showTooltip,
	    hideTooltip: hideTooltip,
	    updatePosition: updatePosition
	  };
	};

	var addCommas = function(nStr) {
	  nStr += '';
	  x = nStr.split('.');
	  x1 = x[0];
	  x2 = x.length > 1 ? '.' + x[1] : '';
	  var rgx = /(\d+)(\d{3})/;

	  while (rgx.test(x1)) {
	    x1 = x1.replace(rgx, '$1' + ',' + '$2');
	  }

	  return x1 + x2;
	};

	visualFactory.BubbleChart = function(data) {
	  var max_amount;
	  this.data = data;
	  this.width = 940;
	  this.height = 600;
	  this.tooltip = new CustomTooltip("toolTipID", 240);
	  this.center = {
	    x: this.width / 2,
	    y: this.height / 2
	  };
	  this.due_date_centers = {
	    "1 - 30 days past due": {
	      x: this.width / 3,
	      y: this.height / 2
	    },
	    "31 - 60 days past due": {
	      x: this.width / 2,
	      y: this.height / 2
	    },
	    "61 - 90 days past due": {
	      x: 2 * this.width / 3,
	      y: this.height / 2
	    }
	  };
	  this.layout_gravity = -0.01;
	  this.damper = 0.1;
	  this.vis = null;
	  this.nodes = [];
	  this.force = null;
	  this.circles = null;
	  max_amount = d3.max(this.data, function(d) {
	    return parseInt(d.amount);
	  });
	  this.fill_color = d3.scale.ordinal().domain(["1 - 30 days past due","31 - 60 days past due","61 - 90 days past due"]).range(["green", "blue", "red"]);
	  this.radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([2, 85]);
	  this.create_nodes();
	  this.create_vis();
	};

	visualFactory.BubbleChart.prototype.create_nodes = function() {
	  this.data.forEach((function(_this) {
	    return function(d) {
	      var node;
	      node = {
	        client: d.client,
	        client_id: d.client_id,
	        radius: _this.radius_scale(parseInt(d.amount)),
	        amount: +d.amount,
	        open_balance: d.open_balance,
	        days_past_due: d.days_past_due,
	        due_date: d.due_date,
	        invoice_num: d.invoice_num,
	        invoice_date: d.invoice_date,
	        x: Math.random() * 900,
	        y: Math.random() * 800
	      };
	      return _this.nodes.push(node);
	    };
	  })(this));
	  return this.nodes.sort(function(a, b) {
	    return b.amount - a.amount;
	  });
	};

	visualFactory.BubbleChart.prototype.create_vis = function() {
	  var that;
	  this.vis = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_vis");
	  this.circles = this.vis.selectAll("circle").data(this.nodes, function(d) {
	    return d.client;
	  });
	  that = this;
	  this.circles.enter().append("circle").attr("r", 0).attr("fill", (function(_this) {
	    return function(d) {
	      return _this.fill_color(d.days_past_due);
	    };
	  })(this)).attr("stroke-width", 2).attr("stroke", (function(_this) {
	    return function(d) {
	      return d3.rgb(_this.fill_color(d.days_past_due)).darker();
	    };
	  })(this)).attr("title", function(d) {
	    return "bubble_" + d.client_id;
	  }).on("mouseover", function(d, i) {
	    return that.show_details(d, i, this);
	  }).on("mouseout", function(d, i) {
	    return that.hide_details(d, i, this);
	  });
	  return this.circles.transition().duration(2000).attr("r", function(d) {
	    return d.radius;
	  });
	};

	visualFactory.BubbleChart.prototype.charge = function(d) {
	  return -Math.pow(d.radius, 2.0) / 8;
	};

	visualFactory.BubbleChart.prototype.start = function() {
	  return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
	};

	visualFactory.BubbleChart.prototype.display_group_all = function() {
	  this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", (function(_this) {
	    return function(e) {
	      return _this.circles.each(_this.move_towards_center(e.alpha)).attr("cx", function(d) {
	        return d.x;
	      }).attr("cy", function(d) {
	        return d.y;
	      });
	    };
	  })(this));
	  this.force.start();
	  return this.hide_due_dates();
	};

	visualFactory.BubbleChart.prototype.move_towards_center = function(alpha) {
	  return (function(_this) {
	    return function(d) {
	      d.x = d.x + (_this.center.x - d.x) * (_this.damper + 0.02) * alpha;
	      return d.y = d.y + (_this.center.y - d.y) * (_this.damper + 0.02) * alpha;
	    };
	  })(this);
	};

	visualFactory.BubbleChart.prototype.display_by_seperated = function() {
	  this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", (function(_this) {
	    return function(e) {
	      return _this.circles.each(_this.move_towards_seperated(e.alpha))
	        .attr("cx", function(d) {
	          return d.x;
	        }).attr("cy", function(d) {
	          return d.y;
	        });
	    };
	  })(this));
	  this.force.start();
	  return this.display_seperated();
	};

	visualFactory.BubbleChart.prototype.move_towards_seperated = function(alpha) {
	  return (function(_this) {
	    return function(d) {
	      var target;
	      target = _this.due_date_centers[d.days_past_due];
	      d.x = d.x + (target.x - d.x) * (_this.damper + 0.02) * alpha * 1.1;
	      return d.y = d.y + (target.y - d.y) * (_this.damper + 0.02) * alpha * 1.1;
	    };
	  })(this);
	};

	visualFactory.BubbleChart.prototype.display_seperated = function() {
	  var past_due_x = {
	    "Less Than 30 Days": 240,
	    "30 to 60 Days": this.width / 2 + 100,
	    "60 Days or Older": this.width - 160
	  };

	  var past_due_data = d3.keys(past_due_x);

	  var past_due = this.vis.selectAll(".past_due").data(past_due_data);
	  return past_due.enter()
	    .append("text")
	    .attr("class", "past_due")
	    .attr("x", (function() {
	        return function(d) {
	          return past_due_x[d];
	        };
	      })(this))
	    .attr("y", 40)
	    .attr("text-anchor", "middle")
	    .text(function(d) {
	        return d;
	      });
	};

	visualFactory.BubbleChart.prototype.hide_due_dates = function() {
	  var past_due;
	  return past_due = this.vis.selectAll(".past_due").remove();
	};

	visualFactory.BubbleChart.prototype.show_details = function(data, i, element) {
	  var content;
	  d3.select(element).attr("stroke", "black");
	  content = "<span class=\"name\">Client:</span><span class=\"value\"> " + data.client + "</span><br/>";
	  content += "<span class=\"name\">Client ID:</span><span class=\"value\"> " + data.client_id + "</span><br/>";
	  content += "<span class=\"name\">Amount:</span><span class=\"value\"> $" + (addCommas(data.amount)) + "</span><br/>";
	  content += "<span class=\"name\">Due Date:</span><span class=\"value\"> " + data.due_date + "</span><br/>";
	  content += "<span class=\"name\">Invoice Number:</span><span class=\"value\"> " + data.invoice_num + "</span><br/>";
	  content += "<span class=\"name\">Invoice Date:</span><span class=\"value\"> " + data.invoice_date + "</span><br/>";
	  return this.tooltip.showTooltip(content, d3.event);
	};

	visualFactory.BubbleChart.prototype.hide_details = function(data, i, element) {
	  d3.select(element).attr("stroke", (function(_this) {
	    return function(d) {
	      return d3.rgb(_this.fill_color(d.days_past_due)).darker();
	    };
	  })(this));
	  return this.tooltip.hideTooltip();
	};

	return visualFactory;
}]);