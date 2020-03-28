/**
Gear Solver
Copyright (c) 2016 Justin Overton
Licensed under the MIT license (http://opensource.org/licenses/mit-license.php)
*/
function GearSolver() {
	this.options = {
		timeout: 10000,
		precision: 4,
		minTeeth: 4,
		maxTeeth: 100,
		maxDepth: 5,
		allowFixedRing: true,
		allowFixedSun: true,
		allowFixedPlanet: true,
		allowSpur: true
	};
	
	this.gearCache = [];
	this.gearMap = {};
	this.gearMap.R = {};
	this.gearMap.S = {};
	this.gearMap.P = {};
	this.gearMap.spur = {};
	
	return this;
}

GearSolver.prototype.fixPrecision = function(n){
	return parseFloat(n.toFixed(this.options.precision));
};

GearSolver.prototype.solve = function(ratio) {
	this.buildCache();
	return this.findTrain(ratio, Date.now(), this.options.maxDepth);
};

GearSolver.prototype.findGear = function(ratio){
	
	var g = null;
	if(this.options.allowFixedRing) {
		g = this.gearMap.R[ratio];
	}
	
	if(!g && this.options.allowFixedSun) {
		g = this.gearMap.S[ratio];
	}
	
	if(!g && this.options.allowFixedPlanet) {
		g = this.gearMap.P[ratio];
	}
	
	if(!g && this.options.allowSpur) {
		g = this.gearMap.spur[ratio];
	}
	
	return g;
};

GearSolver.prototype.findTrain = function(ratio, start, maxDepth) {
	if(start === null){
		start = Date.now();
	} else if(Date.now() - start > this.options.timeout) {
		return null;
	}
	
	if(!maxDepth)
		return null;
	
	ratio = this.fixPrecision(ratio);
	
	var found = this.findGear(ratio);
	if(found)
		return [found];
	
	//multiply ratio by precision to remove decimals
	var numer = ratio;// * Math.pow(10, this.options.precision);
	var denomer = 1; //Math.pow(10, this.options.precision);
	
	while(numer % 1 !== 0) {
		numer *= 10;
		denomer *= 10;
	}
	
	/*
	Simple example of what's going on here
	10.4/5 with precision of 1 decimal
	104/50 = 2.08
	
	104 factor 52 quotient 2
	
	var ratio1 = 52/50
	var ratio2 = 2/1
	var final = ratio1 * ratio2
	(52/50) = 1.04
	1.04 * (2/1) = 1.04 * 2) = 2.08
	
	On the other side....
	
	10.4/5 with precision of 1 decimal
	104/50 = 2.08
	
	50 factor 10 quotient 5
	
	var ratio1 = 104/10
	var ratio2 = 1/5
	var final = ratio1 * ratio2
	(52/50) = 1.04
	1.04 * (2/1) = 1.04 * 2) = 2.08
	*/
	
	for(var i = 2; i <  numer; i++){
		var quotient = numer/i;
		
		if(quotient % 1 === 0){
			var r1 = this.findTrain(i/denomer, start, maxDepth--);
			if(!r1) { continue;}
			var r2 = this.findTrain(quotient, start, maxDepth--);
			if(r2) {
				return r1.concat(r2);
			}
		}
	}
	
	for(var i = 2; i <  denomer; i++){
		var quotient = numer/i;
		
		if(quotient % 1 === 0){
			var r1 = this.findTrain(numer/i, start, maxDepth--);
			if(!r1) { continue;}
			var r2 = this.findTrain(1/quotient, start, maxDepth--);
			if(r2) {
				return r1.concat(r2);
			}
		}
	}
	
	return null;
}

GearSolver.prototype.getFixedRingRatio = function(r, s, p) {
	var ratio = this.fixPrecision(1 + (r/s));
	
	return {
		type: 'planetary',
		inputGear: 'S',
		outputGear: 'P',
		fixedGear: 'R',
		r: r,
		s: s,
		p: p,
		show: true,
		ratio: ratio
	};
};

GearSolver.prototype.getFixedSunRatio = function(r, s, p) {
	var ratio = this.fixPrecision(1 / (1 + (s/r)));	
	return {
		type: 'planetary',
		inputGear: 'P',
		outputGear: 'R',
		fixedGear: 'S',
		r: r,
		s: s,
		p: p,
		show: true,
		ratio: ratio
	};
};

GearSolver.prototype.getFixedPlanetRatio = function(r, s, p) {
	var ratio = this.fixPrecision(-r/s); //not sure how to deal with a negative ratio. Treat it as posive and let the user deal with reversing it with an idler at the end
	return {
		type: 'planetary',
		inputGear: 'S',
		outputGear: 'R',
		fixedGear: 'P',
		r: r,
		s: s,
		p: p,
		show: true,
		ratio: ratio
	};
};

GearSolver.prototype.getSpurRatio = function(r, s) {
	var ratio = this.fixPrecision(r/s);
	return {
		type: 'spur',
		a: r,
		b: s,
		ratio: ratio,
		show: true,
		fixedGear: 'spur'
	};
};

GearSolver.prototype.addGear = function(g, skipInvert) {
	if(!g)
		return;
	
	var map = this.gearMap[g.fixedGear];
	
	if(map[Math.abs(g.ratio)]) {
		return; //avoid duplicates
	} else {
		map[Math.abs(g.ratio)] = g;
	}
	
	if(skipInvert)
		return;
	
	this.addGear({
		type: g.type,
		inputGear: g.outputGear,
		outputGear: g.inputGear,
		fixedGear: g.fixedGear,
		a: g.a,
		b: g.b,
		r: g.r,
		s: g.s,
		p: g.p,
		show: true,
		ratio: this.fixPrecision(1/g.ratio)
	}, true);
}

GearSolver.prototype.buildCache = function() {
	if(this.isbuilt)
		return;
	this.isbuilt = true;
	
	this.gearCache = [];
	this.gearMap = {};
	this.gearMap.R = {};
	this.gearMap.S = {};
	this.gearMap.P = {};
	this.gearMap.spur = {};
	
	//R = 2P + S
	//ratio = 1 + R/S
	//P = (R-S)/2
	
	for(var s=this.options.minTeeth; s<this.options.maxTeeth; s++) {
		for(var r=this.options.minTeeth; r<this.options.maxTeeth; r++) {
			
			var planetaryCompatible = true;
			if(r <= s)
				planetaryCompatible = false;
			
			var p = (r-s)/2;
			if(p < Math.max(4, this.options.minTeeth) || (p % 1 !== 0)) //p has to be a whole number and greater than min teeth
				planetaryCompatible = false;
			
			if(planetaryCompatible) {
				this.addGear(this.getFixedRingRatio(r, s, p));
				this.addGear(this.getFixedSunRatio(r, s, p));
				this.addGear(this.getFixedPlanetRatio(r, s, p));
			}
			
			this.addGear(this.getSpurRatio(r, s));
		}
	}
};

function GearSolverCtrl(GearSolver, $scope, $http) {
	var gs = GearSolver;
	$scope.options = {
		timeout:10000, //millis
		precision:4, //decimal points
		minTeeth:8,
		maxTeeth:100,
		maxDepth:5,
		allowFixedRing:true,
		allowFixedSun:true,
		allowFixedPlanet:true,
		allowSpur:true,
		ratio: 3.4,
		minCircularPitch: .5,
		pressureAngle: 20,
		centerHoleDiameter: 0.25
	};
	
	$scope.isStale = true;
	$scope.train = null;
	$scope.isSolved = false;
	$scope.isRendering = false;
	
	$scope.$watch('options', function(){
		$scope.isStale = true;
	}, true);
	
	$scope.$watch('options.minTeeth', function(){
		gs.isbuilt = false;
	});
	
	$scope.$watch('options.maxTeeth', function(){
		gs.isbuilt = false;
	});
	
	$scope.solve = function() {
		
		$scope.isStale = false;
		$scope.train = null;
		$scope.isSolved = false;
		gs.options = $scope.options;
		
		$scope.train = gs.solve($scope.options.ratio);
		$scope.isSolved = true;
		
		if($scope.train == null)
			return;
		
		for(var i=0; i<$scope.train.length; i++) {
			var g = $scope.train[i];
			
			var cp = $scope.options.minCircularPitch * 90; //svg w3c says 90px per inch
			var hole = $scope.options.centerHoleDiameter * 90;
			
			if(g.type == 'planetary') {
				
				g.gears = {
					ring: new Gear({
			      			toothCount: -g.r,
							circularPitch: cp,
							pressureAngle: $scope.options.pressureAngle,
							clearance: 0.05,
							backlash: 0.05,
							centerHoleDiameter: hole,
							profileShift: -0,
							qualitySettings: {resolution: 60, stepsPerToothAngle: 3}
						}),
					planet: new Gear({
			      			toothCount: g.s,
							circularPitch: cp,
							pressureAngle: $scope.options.pressureAngle,
							clearance: 0.05,
							backlash: 0.05,
							centerHoleDiameter: hole,
							profileShift: -0,
							qualitySettings: {resolution: 30, stepsPerToothAngle: 3}
						}),
					sun: new Gear({
			      			toothCount: g.p,
							circularPitch: cp,
							pressureAngle: $scope.options.pressureAngle,
							clearance: 0.05,
							backlash: 0.05,
							centerHoleDiameter: hole,
							profileShift: -0,
							qualitySettings: {resolution: 30, stepsPerToothAngle: 3}
						}),
					assembly: new PlanetaryAssembly($scope.options.minCircularPitch, g.r, g.s, g.p, 3, $scope.options.centerHoleDiameter)
				};
			} else {
				
				g.gears = {
					a: new Gear({
			      			toothCount: g.a,
							circularPitch: cp,
							pressureAngle: $scope.options.pressureAngle,
							clearance: 0.05,
							backlash: 0.05,
							centerHoleDiameter: hole,
							profileShift: -0,
							qualitySettings: {resolution: 30, stepsPerToothAngle: 3}
						}),
					b: new Gear({
			      			toothCount: g.b,
							circularPitch: cp,
							pressureAngle: $scope.options.pressureAngle,
							clearance: 0.05,
							backlash: 0.05,
							centerHoleDiameter: hole,
							profileShift: -0,
							qualitySettings: {resolution: 30, stepsPerToothAngle: 3}
						})
				};
			}
		}
	};
}

angular.module('GearSolverApp', [])
	.factory('GearSolver', function(){ return new GearSolver();})
	.controller('GearSolverCtrl', GearSolverCtrl)
	.config( [
	    '$compileProvider',
	    function( $compileProvider )
	    {   
	    	//Need to add this because the blob download links are getting blocked
	        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|blob):/);
	    }
	]);
