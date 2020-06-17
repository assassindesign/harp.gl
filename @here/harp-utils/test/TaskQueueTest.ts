/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:only-arrow-functions
//    Mocha discourages using arrow functions, see https://mochajs.org/#arrow-functions

import { assert } from "chai";
import { Task, TaskQueue } from "../lib/TaskQueue";

describe("TaskQueue", function() {
    it("create TaskQueue", function() {
        const taskQueue = new TaskQueue({});
        assert.equal(taskQueue.numItemsLeft(), 0);
        assert.isFalse(taskQueue.processNext("group1"));
    });

    it("add task of not existent group", function() {
        const taskQueue = new TaskQueue({ groups: ["group2"] });
        assert.isFalse(
            taskQueue.add({
                execute: () => {
                    return 1;
                },
                group: "group1",
                getPrio: () => {
                    return 6;
                }
            })
        );
        assert.equal(taskQueue.numItemsLeft(), 0);
        assert.isFalse(taskQueue.processNext("group2"));
        assert.isFalse(taskQueue.processNext("group1"));
    });

    it("add Task and process", function() {
        const taskQueue = new TaskQueue({ groups: ["group1", "group2"] });
        assert.isTrue(
            taskQueue.add({
                execute: () => {
                    return 1;
                },
                group: "group1",
                getPrio: () => {
                    return 6;
                }
            })
        );
        assert.equal(taskQueue.numItemsLeft(), 1);
        assert.isFalse(taskQueue.processNext("group2"));

        assert.equal(taskQueue.numItemsLeft(), 1);
        assert.isTrue(taskQueue.processNext("group1"));

        assert.equal(taskQueue.numItemsLeft(), 0);
        assert.isFalse(taskQueue.processNext("group1"));
    });

    it("update and remove expired", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            },
            isExpired: () => {
                return true;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 7;
            },
            group: "group1",
            getPrio: () => {
                return 7;
            },
            isExpired: () => {
                return false;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 8;
            },
            group: "group1",
            getPrio: () => {
                return 8;
            },
            isExpired: () => {
                return true;
            }
        });

        assert.equal(taskQueue.numItemsLeft(), 3);
        taskQueue.update();
        assert.equal(taskQueue.numItemsLeft(), 1);
        assert.equal(taskQueue.processNext("group1"), true);
        assert.equal(testValue, 7);
    });

    it("updates with default sort priority", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 8;
            },
            group: "group1",
            getPrio: () => {
                return 8;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 3;
            },
            group: "group1",
            getPrio: () => {
                return 3;
            }
        });

        assert.equal(taskQueue.numItemsLeft(), 3);
        taskQueue.update();
        assert.equal(taskQueue.numItemsLeft(), 3);
        assert.equal(taskQueue.processNext("group1"), true);
        assert.equal(testValue, 3);
        assert.equal(taskQueue.processNext("group1"), true);
        assert.equal(testValue, 6);
        assert.equal(taskQueue.processNext("group1"), true);
        assert.equal(testValue, 8);
        assert.equal(taskQueue.processNext("group1"), false);
    });

    it("updates with custom sort priority", function() {
        const taskQueue = new TaskQueue({
            groups: ["group1"],
            prioSortFn: (a: Task, b: Task) => {
                return a.getPrio() - b.getPrio();
            }
        });

        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 8;
            },
            group: "group1",
            getPrio: () => {
                return 8;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 3;
            },
            group: "group1",
            getPrio: () => {
                return 3;
            }
        });

        assert.equal(taskQueue.numItemsLeft(), 3);
        taskQueue.update();
        assert.equal(taskQueue.numItemsLeft(), 3);
        assert.equal(taskQueue.processNext("group1"), true);
        assert.equal(testValue, 8);
        assert.equal(taskQueue.processNext("group1"), true);
        assert.equal(testValue, 6);
        assert.equal(taskQueue.processNext("group1"), true);
        assert.equal(testValue, 3);
        assert.equal(taskQueue.processNext("group1"), false);
    });

    it("process a task", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            }
        });
        taskQueue.processNext("group1");

        assert.equal(testValue, 6);
    });

    it("process multiple tasks", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 4;
            },
            group: "group1",
            getPrio: () => {
                return 4;
            }
        });

        taskQueue.processNext("group1", undefined, 2);

        assert.equal(testValue, 6);
    });

    it("process multiple tasks, with one expired", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            },
            isExpired: () => {
                return true;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 4;
            },
            group: "group1",
            getPrio: () => {
                return 4;
            }
        });

        taskQueue.processNext("group1", undefined, 2);

        assert.equal(testValue, 4);
    });

    it("process an task when the next is an expired task", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 4;
            },
            group: "group1",
            getPrio: () => {
                return 4;
            },
            isExpired: () => {
                return true;
            }
        });

        taskQueue.processNext("group1");

        assert.equal(testValue, 6);
    });

    it("process an task with unmet processing condition", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            }
        });

        taskQueue.processNext("group1", task => {
            return task.getPrio() > 7;
        });

        assert.equal(testValue, 0);
    });

    it("process an task with unmet processing condition, when next is expired", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        let testValue = 0;
        taskQueue.add({
            execute: () => {
                testValue = 6;
            },
            group: "group1",
            getPrio: () => {
                return 6;
            }
        });

        taskQueue.add({
            execute: () => {
                testValue = 4;
            },
            group: "group1",
            getPrio: () => {
                return 4;
            },
            isExpired: () => {
                return true;
            }
        });

        taskQueue.processNext("group1", task => {
            return task.getPrio() === 4;
        });

        assert.equal(testValue, 0);
    });

    it("request process of an empty list", function() {
        const taskQueue = new TaskQueue({ groups: ["group1"] });
        assert.isFalse(taskQueue.processNext("group1"));
    });

    it("adding task exceeds max length", function() {
        //TODO: implement
        assert.isTrue(true);
    });
});
