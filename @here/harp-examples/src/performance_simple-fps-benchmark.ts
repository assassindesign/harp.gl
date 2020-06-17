/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */
declare function require(module: any): any;

import { GeoCoordinates, mercatorProjection } from "@here/harp-geoutils";
import { CameraKeyTrackAnimation, ControlPoint } from "@here/harp-map-controls";
import { computeArrayStats, MapViewEventNames, PerformanceStatistics } from "@here/harp-mapview";
import { GUI } from "dat.gui";

// tslint:disable-next-line:no-var-requires
const Stats = require("stats.js");
import THREE = require("three");

import { HelloWorldExample } from "./getting-started_hello-world_npm";

const stats = new Stats();
document.body.appendChild(stats.dom);
stats.dom.style.left = "100px";
stats.dom.style.position = "fixed";

const perfStatisticsContainer = document.createElement("div");
perfStatisticsContainer.style.background = "#aaaaaaaa";
perfStatisticsContainer.style.position = "absolute";
perfStatisticsContainer.style.bottom = "100px";
perfStatisticsContainer.style.overflow = "scroll";
perfStatisticsContainer.style.height = "100px";
perfStatisticsContainer.style.width = "450px";

document.body.appendChild(perfStatisticsContainer);

const perfStatisticsContent = document.createElement("p");
perfStatisticsContent.style.position = "absolute";
perfStatisticsContent.style.minHeight = "80px";
perfStatisticsContent.style.bottom = "0%";
perfStatisticsContent.innerText =
    "The fps results will appear after the animation finishes" + "\n value: per frame (per second)";

perfStatisticsContainer.appendChild(perfStatisticsContent);

export namespace FpsBenchmarkExample {
    const mapView = HelloWorldExample.mapView;
    mapView.projection = mercatorProjection;
    mapView.lookAt({
        target: new GeoCoordinates(51.28043, -0.56316),
        tilt: 0,
        heading: 0,
        distance: 5000
    });
    const geoLocations = {
        Dubai: new GeoCoordinates(25.19705, 55.27419),
        BerlinStation: new GeoCoordinates(52.5250871, 13.367208),
        BerlinReichstag: new GeoCoordinates(52.5186234, 13.373993),
        BerlinTower: new GeoCoordinates(52.52081829, 13.407225)
    };

    const cameraAnimationOptions = {
        interpolation: THREE.InterpolateLinear,
        controlPoints: [
            new ControlPoint({
                target: geoLocations.BerlinReichstag,
                distance: 500000,
                timestamp: 0
            }),

            new ControlPoint({
                target: geoLocations.BerlinReichstag,
                distance: 1000,
                tilt: 45,
                timestamp: 5
            }),

            new ControlPoint({
                target: geoLocations.BerlinStation,
                distance: 10000,
                tilt: 80,
                timestamp: 7
            }),

            new ControlPoint({
                target: geoLocations.BerlinReichstag,
                distance: 500,
                tilt: 85,
                heading: -180,
                timestamp: 12
            }),

            new ControlPoint({
                target: geoLocations.BerlinTower,
                distance: 5000,
                tilt: 70,
                heading: 270,
                timestamp: 20
            }),

            new ControlPoint({
                target: geoLocations.BerlinStation,
                distance: 100,
                tilt: 80,
                heading: 360,
                timestamp: 30
            }),

            new ControlPoint({
                target: geoLocations.BerlinStation,
                distance: 1000000,
                timestamp: 35,
                heading: 35
            }),

            new ControlPoint({
                target: geoLocations.BerlinStation,
                distance: 200,
                tilt: 0,
                timestamp: 40,
                heading: 300
            }),
            new ControlPoint({
                target: geoLocations.BerlinTower,
                distance: 1000,
                tilt: 85,
                heading: 20,
                timestamp: 45
            })
        ]
    };

    const flyOverAnimation = new CameraKeyTrackAnimation(mapView, cameraAnimationOptions);

    const gui = new GUI();

    const options = {
        maxTilesPerFrame: mapView.visibleTileSet.maxTilesPerFrame,
        throttlingEnabled: mapView.throttlingEnabled,
        delayLabels: mapView.delayLabelsUntilMovementFinished,
        renderLabels: mapView.renderLabels,
        enableMixedLod: mapView.enableMixedLod || false
    };
    gui.add(options, "maxTilesPerFrame", 1, 100, 1)
        .onFinishChange(value => {
            mapView.visibleTileSet.maxTilesPerFrame = value;
        })
        .listen();

    gui.add(options, "throttlingEnabled")
        .onFinishChange(value => {
            mapView.throttlingEnabled = value;
        })
        .listen();

    gui.add(options, "delayLabels")
        .onFinishChange(value => {
            mapView.delayLabelsUntilMovementFinished = value;
        })
        .listen();

    gui.add(options, "renderLabels")
        .onFinishChange(value => {
            mapView.renderLabels = value;
        })
        .listen();

    gui.add(options, "enableMixedLod")
        .onFinishChange(value => {
            mapView.enableMixedLod = value;
        })
        .listen();

    const statsBegin = stats.begin.bind(stats);
    const statsEnd = stats.end.bind(stats);
    class FpsCounter {
        private currentTime: number | undefined;
        private previousTime: number | undefined;
        private passedFrames: number = 0;
        private measureDelay: number = 1000;
        private fpsArray: number[] = [];

        update() {
            this.currentTime = (performance || Date).now();
            this.passedFrames++;
            if (this.previousTime === undefined) {
                this.previousTime = this.currentTime;
            }
            if (this.passedFrames > 0) {
                if (this.currentTime >= this.previousTime + this.measureDelay) {
                    this.fpsArray.push(
                        (1000 * this.passedFrames) / (this.currentTime - this.previousTime)
                    );

                    this.previousTime = this.currentTime;
                    this.passedFrames = 0;
                }
            }
        }
        reset() {
            this.fpsArray = [];
            this.passedFrames = 0;
            this.currentTime = undefined;
            this.previousTime = undefined;
        }

        getFps() {
            return this.fpsArray;
        }
    }

    const fpsCounter = new FpsCounter();
    mapView.addEventListener(MapViewEventNames.Render, () => {
        fpsCounter.update();
        statsEnd();
        statsBegin();
    });
    let wasCanceled = false;
    let runCount = 0;
    PerformanceStatistics.instance.enabled = true;

    gui.add(
        {
            startBenchmark: () => {
                PerformanceStatistics.instance.clear();
                fpsCounter.reset();
                if (flyOverAnimation.isRunning()) {
                    wasCanceled = true;
                    flyOverAnimation.stop();
                }
                wasCanceled = false;
                flyOverAnimation.start(0, () => {
                    if (!wasCanceled) {
                        const perfResult = PerformanceStatistics.instance.getAsPlainObject();
                        const fpsArray = perfResult.frames["render.fps"];
                        //remove first value as it containes the time from the last render before
                        //the animation started
                        fpsArray.shift();
                        const statistics = computeArrayStats(fpsArray);
                        const fpsCounterArray = fpsCounter.getFps();
                        const statistics2 = computeArrayStats(fpsCounterArray);
                        runCount++;
                        perfStatisticsContent.innerText +=
                            "\nrun: #" +
                            runCount +
                            "::::" +
                            "min: " +
                            Math.floor(statistics?.min || 0) +
                            "(" +
                            Math.floor(statistics2?.min || 0) +
                            ")" +
                            " max: " +
                            Math.floor(statistics?.max || 0) +
                            "(" +
                            Math.floor(statistics2?.max || 0) +
                            ")" +
                            " avg: " +
                            Math.floor(statistics?.avg || 0) +
                            "(" +
                            Math.floor(statistics2?.avg || 0) +
                            ")" +
                            " median: " +
                            Math.floor(statistics?.median || 0) +
                            "(" +
                            Math.floor(statistics2?.median || 0) +
                            ")";
                    }
                });
            }
        },
        "startBenchmark"
    );

    gui.add(
        {
            ["cancel"]: () => {
                wasCanceled = true;
                flyOverAnimation.stop();
            }
        },
        "cancel"
    );
}
