/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */
import { Task, TaskQueue } from "@here/harp-utils";

import { MapView, TileTaskGroups } from "./MapView";

export class MapViewTaskScheduler {
    private m_taskQueue: TaskQueue;
    private m_throttlingEnabled: boolean = false;

    constructor(private m_mapView: MapView) {
        this.m_taskQueue = new TaskQueue({
            groups: [TileTaskGroups.FETCH_AND_DECODE, TileTaskGroups.CREATE],
            prioSortFn: (a: Task, b: Task) => {
                return a.getPrio() - b.getPrio();
            }
        });
    }

    get taskQueue() {
        return this.m_taskQueue;
    }

    get throttlingEnabled(): boolean {
        return this.m_throttlingEnabled === true;
    }

    set throttlingEnabled(enabled: boolean) {
        this.m_throttlingEnabled = enabled;
    }

    /**
     * Processes the pending Tasks of the underlying [[TaskQueue]]
     * !! This should run at the end of the renderLoop, so the calculations of the available
     * frame time are better estimated
     *
     * @param frameStartTime the start time of the current frame, is used to calculate the
     * still available time in the frame to process Tasks
     *
     */
    processPending(frameStartTime: number) {
        //update the task queue, to remove expired and sort with priority
        this.m_taskQueue.update();

        if (this.throttlingEnabled) {
            // get the available time in this frame to achieve a max fps rate
            let availableTime = this.spaceInFrame(frameStartTime);
            availableTime -= 2; // get some buffer for other things still happening in this frame
            let counter = 0;
            // check if ther is still time available and tasks left
            while (availableTime > 0 && this.m_taskQueue.numItemsLeft() > 0) {
                counter++;
                // create a processing condition for the tasks
                function shouldProcess(task: Task) {
                    // if there is a time estimate use it, otherwise default to 2 ms
                    // TODO: check whats a sane default, 2 seems to do it for now
                    availableTime -= task.estimatedProcessTime?.() || 2;
                    // always process at least 1 Task, so in the worst case the fps over tiles
                    // paradigma is sacrificed to not have an empty screen
                    if (availableTime > 0 || counter === 1) {
                        return true;
                    }
                    return false;
                }

                // process the CREATE tasks first, as they will have a faster result on the
                // visual outcome and have already spend time in the application during
                // fetching and decoding
                // fetching has lower priority as it wont make to much of a difference if not
                // called at the exact frame, and the tile might expire in the next anyway
                [TileTaskGroups.CREATE, TileTaskGroups.FETCH_AND_DECODE].forEach(tag => {
                    if (this.m_taskQueue.numItemsLeft(tag)) {
                        //TODO:
                        // * if one tag task does not fit another might, how to handle this?
                        // *    ** what if a task of another group could fit instead
                        // * whats the average of time we have here at this point in the programm?
                        this.m_taskQueue.processNext(tag, shouldProcess);
                    }
                });
            }
            // if there is tasks left in the TaskQueue, request an update to be able to process them
            // in a next frame
            if (this.m_taskQueue.numItemsLeft() > 0) {
                this.m_mapView.update();
            }
        } else {
            //if throttling is disabled, process all pending tasks
            this.m_taskQueue.processNext(
                TileTaskGroups.CREATE,
                undefined,
                this.m_taskQueue.numItemsLeft(TileTaskGroups.CREATE)
            );
            this.m_taskQueue.processNext(
                TileTaskGroups.FETCH_AND_DECODE,
                undefined,
                this.m_taskQueue.numItemsLeft(TileTaskGroups.FETCH_AND_DECODE)
            );
        }
    }

    private spaceInFrame(frameStartTime: number): number {
        const passedTime = (performance || Date).now() - frameStartTime;
        // if maxFps is 0, assume 60 as target fps
        return 1000 / (this.m_mapView.maxFps || 60) - passedTime;
    }
}
