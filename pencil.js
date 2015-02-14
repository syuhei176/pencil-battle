(function(){
	var editor = new Vue({
	  el: '#editor',
	  data: {
	  	left : 10,
	  	command : [{
	  		type : "atk",
	  		name : "体当たり",
	  		point : 10
	  	}]
	  },
	  filters: {
	  }
	});

	var EMPTY = 0;
	var RED = 1;
	var GREEN = 2;
	var BLUE = 3;
	var YELLOW = 4;
	var PURPLE = 5;
	var BLOCK = 6;
	var WIDTH = 6;
	var HEIGHT = 11;

	function Main() {
		this.phase = Main.PHASE_MAIN;
		this.map = [];
		this.elements = [];
		this.cursor = {
			map : [],
			elems : [],
			active : true,
			x : 0,
			y : 0,
			r : 0
		}
		this.callbacks = {
			"chain" : null,
			"gameover" : null
		}
		this.reserved = [];
	}

	Main.PHASE_MAIN = 0;
	Main.PHASE_FALLING = 0;

	Main.prototype.init = function(user_id) {
		this.user_id = user_id;
	}

	Main.prototype.on = function(event, cb) {
		this.callbacks[event] = cb;
	}

	Main.prototype.create_random_map = function() {
		for(var i=WIDTH*9;i < WIDTH*HEIGHT;i++) {
			this.map[i] = ( Math.floor(Math.random() * 100) % 6) + 1;
 		}
	}

	Main.prototype.create_random_puyo_reserved = function(amount) {
		if(amount <= 2) {
			this.reserved.push(amount);
		}else if(amount <= 4){
			this.reserved.push(2);
			this.reserved.push(amount-2);
		}else{
			this.reserved.push(2);
			this.reserved.push(2);
			this.reserved.push(amount-4);
		}
	}
	Main.prototype.check_reserved_block = function() {
		var b = this.reserved.shift();
		if(b) {
			if(b == 1) {
				this.set_map(6, 0, ( Math.floor(Math.random() * 100) % 6) + 1);
			}else if(b == 2) {
				for(var i=0;i < WIDTH;i++) {
					this.set_map(i, 0, ( Math.floor(Math.random() * 100) % 6) + 1);
				}
			}else{
				for(var i=0;i < WIDTH;i++) {
					this.set_map(i, 0, ( Math.floor(Math.random() * 100) % 6) + 1);
				}
				this.set_map(6, 1, ( Math.floor(Math.random() * 100) % 6) + 1);
			}
			return true;
		}
		return false;
	}

	Main.prototype.create_puyo = function() {
		console.log("create_puyo");
		if(this.get_map(2, 0) != EMPTY || this.get_map(2, 1) != EMPTY) return false;
		this.cursor.map[0] = ( Math.floor(Math.random() * 100) % 5) + 1;
		this.cursor.map[1] = ( Math.floor(Math.random() * 100) % 5) + 1;
		this.cursor.x = 2;
		this.cursor.y = 0;
		this.cursor.r = 0;
		this.cursor.active = true;
		return true;
	}

	Main.prototype.get_map = function(x, y) {
		if(x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return BLOCK;
		return this.map[x + y * WIDTH];
	}

	Main.prototype.set_map = function(x, y, c) {
		if(x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
		this.map[x + y * WIDTH] = c;
	}

	Main.prototype.check_coll = function(x, y, r) {
		var self = this;
		if(r == 0)
			return self.get_map(x, y + 1) != EMPTY || self.get_map(x, y) != EMPTY;
		if(r == 1)
			return self.get_map(x - 1, y) != EMPTY || self.get_map(x, y) != EMPTY;
		if(r == 2)
			return self.get_map(x, y - 1) != EMPTY || self.get_map(x, y) != EMPTY;
		if(r == 3)
			return self.get_map(x + 1, y) != EMPTY || self.get_map(x, y) != EMPTY;
	}

	Main.prototype.paste_cursor = function() {
		var self = this;
		if(self.cursor.r == 0) {
			self.set_map(self.cursor.x, self.cursor.y, self.cursor.map[0]);
			self.set_map(self.cursor.x, self.cursor.y+1, self.cursor.map[1]);
		}else if(self.cursor.r == 1) {
			self.set_map(self.cursor.x, self.cursor.y, self.cursor.map[0]);
			self.set_map(self.cursor.x-1, self.cursor.y, self.cursor.map[1]);
		}else if(self.cursor.r == 2) {
			self.set_map(self.cursor.x, self.cursor.y, self.cursor.map[0]);
			self.set_map(self.cursor.x, self.cursor.y-1, self.cursor.map[1]);
		}else if(self.cursor.r == 3) {
			self.set_map(self.cursor.x, self.cursor.y, self.cursor.map[0]);
			self.set_map(self.cursor.x+1, self.cursor.y, self.cursor.map[1]);
		}
	}

	Main.prototype.move_left = function() {
		var self = this;
		if(!self.check_coll(self.cursor.x-1, self.cursor.y, self.cursor.r)) {
			self.cursor.x--;
			self.refresh_svg();
		}
	}
	Main.prototype.move_right = function() {
		var self = this;
		if(!self.check_coll(self.cursor.x+1, self.cursor.y, self.cursor.r)) {
			self.cursor.x++;
			self.refresh_svg();
		}
	}
	Main.prototype.rotate = function() {
		var self = this;
		var next_r = self.cursor.r;
		next_r++;
		if(next_r >= 4) next_r = 0;
		if(!self.check_coll(self.cursor.x, self.cursor.y, next_r)) {
			self.cursor.r = next_r;
			self.refresh_svg();
		}
	}
	Main.prototype.main_frame = function() {
		var self = this;
		if(!self.check_coll(self.cursor.x, self.cursor.y + 1, self.cursor.r)) {
			self.cursor.y++;
			self.refresh_svg();
			setTimeout(function() {
				self.main_frame();
			}, 800);
		}else{
			self.paste_cursor();
			self.cursor.active = false;
			self.falling_frame(0, 0);
		}
	}

	Main.prototype.falling_frame = function(chain, score) {
		var self = this;
		self.falling_down(function() {
			self.refresh_svg();
			vanish_frame(chain, score);
		});
		function vanish_frame(chain, score) {
			var flg = false;
			var count = 0;
			for(var y=0;y < HEIGHT;y++) {
				for(var x=0;x < WIDTH;x++) {
					var c = self.cal(x, y)
					if(c > 0) flg = true;
					count += c;
				}
			}
			self.refresh_svg();
			if(flg) {
				setTimeout(function() {
					self.falling_frame(chain + 1, score + count * ((chain+1) * (chain+1)));
				}, 800);
			}else{
				console.log(chain + "連鎖");
				if(chain > 0) self.callbacks["chain"]({
					chain : chain,
					score : score
				});
				if(self.check_reserved_block()) {
					self.falling_frame(0, score);
				}else{
					if(self.create_puyo()) {
						self.refresh_svg();
						self.main_frame();
					}else{
						self.create_text("Game Over");
						self.callbacks["gameover"]();
						setTimeout(function() {
							location.reload();
						}, 1000);
					}
				}
			}
		}

	}

	Main.prototype.falling_down = function(cb) {
		var self = this;
		falling_down2(cb);
		function falling_down2(cb) {
			var flg = false;
			for(var y=HEIGHT-1;y >= 0;y--) {
				for(var x=0;x < WIDTH;x++) {
					if(y - 1 >= 0 && self.map[x + (y - 1) * WIDTH] != EMPTY && self.map[x + y * WIDTH] == EMPTY) {
						self.map[x + y * WIDTH] = self.map[x + (y - 1) * WIDTH];
						self.map[x + (y - 1) * WIDTH] = EMPTY;
						flg = true;
					}
				}
			}
			if(flg) {
				setTimeout(function() {
					falling_down2(cb);
					self.refresh_svg();
				}, 400);
			}else{
				cb();
			}

		}
	}

	Main.prototype.cal = function(x, y) {
		var self = this;
		var map2 = [];
		var list = [];
		for(var i=0;i < WIDTH*HEIGHT;i++) map2[i] = 0;
		if(this.map[x + y * WIDTH] == BLOCK) return 0;
		var c = cal2(x, y, this.map[x + y * WIDTH]);
		if(c >= 4) {
			list.forEach(function(t) {
				self.map[t.x + t.y * WIDTH] = EMPTY;
				if(self.get_map(t.x + 1, t.y) == BLOCK) self.set_map(t.x + 1, t.y, EMPTY);
				if(self.get_map(t.x - 1, t.y) == BLOCK) self.set_map(t.x - 1, t.y, EMPTY);
				if(self.get_map(t.x, t.y + 1) == BLOCK) self.set_map(t.x, t.y + 1, EMPTY);
				if(self.get_map(t.x, t.y - 1) == BLOCK) self.set_map(t.x, t.y - 1, EMPTY);
			});
			return c;
		}
		return 0;
		function cal2(x, y, color) {
			if(x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return 0;
			if(self.map[x + y * WIDTH] == EMPTY) return 0;
			if(map2[x + y * WIDTH] == 1) return 0;
			map2[x + y * WIDTH] = 1;
			if(self.map[x + y * WIDTH] != color) return 0;
			list.push({x : x, y : y});
			return cal2(x + 1, y, color) + cal2(x - 1, y, color) + cal2(x, y + 1, color) + cal2(x, y - 1, color) + 1;
		}
	}

	Main.prototype.refresh_svg = function() {
		for(var y=0;y < HEIGHT;y++) {
			for(var x=0;x < WIDTH;x++) {
				var map_type = this.map[x + y * WIDTH];
				this.elements[x + y * WIDTH].attr({
				    fill: get_color(map_type),
				    stroke: "#000",
				    strokeWidth: 5
				});
			}
		}
		this.cursor.elems[0].attr({
		    fill: get_color(this.cursor.map[0]),
		    stroke: "#000",
		    strokeWidth: 5,
		    "fill-opacity" : this.cursor.active ? 1 : 0,
			cx : this.cursor.x*60+30,
			cy : this.cursor.y*60+30
		});
		var cxx = [0, -1, 0, 1];
		var cyy = [1, 0, -1, 0];
		this.cursor.elems[1].attr({
		    fill: get_color(this.cursor.map[1]),
		    stroke: "#000",
		    strokeWidth: 5,
		    "fill-opacity" : this.cursor.active ? 1 : 0,
			cx : (this.cursor.x + cxx[this.cursor.r])*60+30,
			cy : (this.cursor.y + cyy[this.cursor.r])*60+30
		});

		function get_color(t) {
			switch(t) {
				case RED:
					return "#ff0000";
				case GREEN:
					return "#00ff00";
				case BLUE:
					return "#0000ff";
				case YELLOW:
					return "#ffff00";
				case PURPLE:
					return "#ff00ff";
				case BLOCK:
					return "#777777";
			}
		}
	}
	Main.prototype.create_control = function(s) {
		var self = this;
		var rightArrow = s.polyline([240, 400, 350, 450, 240, 500]);
		var leftArrow = s.polyline([120, 400, 0, 450, 120, 500]);
		var leftBtn		= s.rect(0,		400, 120, 100, 10, 10);
		var rBtn		= s.rect(120,	400, 120, 100, 10, 10);
		var rightBtn	= s.rect(240,	400, 120, 100, 10, 10);
		leftBtn.attr({
		    fill: "#707070",
		    "fill-opacity" : 0.5,
		    stroke: "#000",
		    strokeWidth: 2,
		});
		rBtn.attr({
		    fill: "#707070",
		    "fill-opacity" : 0.5,
		    stroke: "#000",
		    strokeWidth: 2,
		});
		rightBtn.attr({
		    fill: "#707070",
		    "fill-opacity" : 0.5,
		    stroke: "#000",
		    strokeWidth: 2,
		});
		rightArrow.attr({
		    fill: "#305030",
		    "fill-opacity" : 0.5,
		    stroke: "#000",
		    strokeWidth: 2,
		});
		leftArrow.attr({
		    fill: "#305030",
		    "fill-opacity" : 0.5,
		    stroke: "#000",
		    strokeWidth: 2,
		});
		leftBtn.click(function() {
			self.move_left();
		});
		rBtn.click(function() {
			self.rotate();
		});
		rightBtn.click(function() {
			self.move_right();
		});
	}
	Main.prototype.create_text = function(text) {
		var rect = this.snap.rect(20, 250, 320, 100, 10, 10);
		var t = this.snap.text(100, 300, text);
		t.attr({
			"font-size" : 20
		});
		rect.attr({
		    fill: "#a0a0a0",
		    "fill-opacity" : 0.7,
		    stroke: "#000",
		    strokeWidth: 2,
		});
		setTimeout(function() {
			t.remove();
			rect.remove();
		}, 2000);
	}
	Main.prototype.create_svg = function() {
		var svgElement = document.getElementById("svg");
		var tm = window.innerWidth / 320;
		svgElement.setAttribute("width", window.innerWidth-30);
		svgElement.setAttribute("height", window.innerHeight-30);
		svgElement.setAttribute("viewBox", "0 0 320 700");
		var s = Snap(svgElement);
		this.snap = s;
		for(var y=0;y < HEIGHT;y++) {
			for(var x=0;x < WIDTH;x++) {
				var circle = s.circle(0, 0, 30);
				circle.attr({cx : x*60+30, cy : y*60+30});
				this.elements[x + y * WIDTH] = circle;
			}
		}
		this.cursor.elems[0] = s.circle(0, 0, 30);
		this.cursor.elems[1] = s.circle(0, 0, 30);

		this.refresh_svg();

		this.create_control(s);
	}

	window.Main = Main;
}())