import Event from '../../models/event.js';
import { syncEventHistory } from '../utils/event-tracker.js';

/**
 * Reconcile surviving EMS events, including scheduled events and interrupted writes.
 * Existing history keeps its explicit language channel and invalidation status.
 */
export default async function backfillEventHistory() {
  const events = await Event.find();
  for (const event of events) {
    await syncEventHistory(event);
  }
}
