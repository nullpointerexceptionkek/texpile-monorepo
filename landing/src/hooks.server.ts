import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';
import { m } from '$lib/paraglide/messages';

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%lang%', locale)
					.replace('%dir%', getTextDirection(locale))
					.replace('%meta_author%', m.meta_author({}, { locale }))
					.replace('%meta_site_name%', m.meta_site_name({}, { locale }))
					.replace('%apple_web_app_title%', m.meta_apple_web_app_title({}, { locale }))
		});
	});

export const handle: Handle = paraglideHandle;
