/* Copyright 2024 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** simple event bus; derivative work based on PDF.js event_utils.js. */
export class EventBus {
	private listeners: Map<string, Set<EventListener>> = new Map();

	on(eventName: string, listener: EventListener): void {
		if (!this.listeners.has(eventName)) {
			this.listeners.set(eventName, new Set());
		}
		this.listeners.get(eventName)!.add(listener);
	}

	off(eventName: string, listener: EventListener): void {
		this.listeners.get(eventName)?.delete(listener);
	}

	dispatch(eventName: string, data?: Record<string, unknown>): void {
		const eventListeners = this.listeners.get(eventName);
		if (!eventListeners || eventListeners.size === 0) {
			return;
		}
		for (const listener of eventListeners) {
			listener({ source: this, ...data });
		}
	}

	destroy(): void {
		this.listeners.clear();
	}
}

export type EventListener = (data: Record<string, unknown>) => void;
