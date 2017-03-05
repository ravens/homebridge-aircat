/*
Title: homebridge-aircat
Author: Yan Grunenberger <yan@grunenberger.net>
Description : a simple homebridge plugin to display air quality of a particular air sensor from the public service sensor network  
*/

"use strict";

var Service, Characteristic;
var aircatQualityService;

var request = require("request");

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-aircat", "aircat", AircatAccessory);
}



function AircatAccessory(log, config) {
	this.log = log;
	this.name = config["name"];
	this.stationid = config["stationid"];
	this.lastupdate = 0;
	this.pm10Measure = 0;
	this.airquality = 0;
	this.periodic = function(){
		this.log("fetching new sensor value from web service");
		var url = "http://api.4sfera.com:8080/aircat/gethistorical?stationid=" + this.stationid;

		request({
			url: url,
			json: true
		}, function (error, response, body) {

			if (!error && response.statusCode === 200) {

				this.airquality = 0;
				this.pm10Measure = body.pollutants.pm10Measure;

				if (body.pollutants.pm10Measure <= 20)
				{
					this.airquality = 1;
				}
				if (body.pollutants.pm10Measure > 20 && body.pollutants.pm10Measure <= 40)
				{
					this.airquality = 2;
				}
				if (body.pollutants.pm10Measure > 40 && body.pollutants.pm10Measure <= 140)
				{
					this.airquality = 3;
				}
				if (body.pollutants.pm10Measure > 140 && body.pollutants.pm10Measure <= 420)
				{
					this.airquality = 4;
				}
				if (body.pollutants.pm10Measure > 200)
				{
					this.airquality = 5;
				}
			};
		}.bind(this));

	};

	this.periodic();

	setInterval(this.periodic.bind(this),60*60*1000);

}

AircatAccessory.prototype = {

	identify: function (callback) {
		callback();
	},

	getServices: function () {
		var informationService = new Service.AccessoryInformation();

		informationService
		.setCharacteristic(Characteristic.Manufacturer, "Aircat")
		.setCharacteristic(Characteristic.Model, "Station")
		.setCharacteristic(Characteristic.SerialNumber, this.stationid)
		.setCharacteristic(Characteristic.Name, this.name);

		aircatQualityService = new Service.AirQualitySensor();

		aircatQualityService
		.getCharacteristic(Characteristic.AirQuality)
		.on("get", function(cb) { 
			cb(null,this.airquality);
		}.bind(this));

		aircatQualityService
		.addCharacteristic(Characteristic.AirParticulateDensity)
		.on("get", function(cb) { 
			cb(null,this.pm10Measure);
		}.bind(this));

		aircatQualityService
		.addCharacteristic(Characteristic.AirParticulateSize)
		.on("get", function(cb) { 
			cb(null,1); // 1 for pm10 size
		}.bind(this));

		return [informationService, aircatQualityService];
	}

}