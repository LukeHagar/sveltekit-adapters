import { fail } from '@sveltejs/kit';
import { Game } from './game';
import type { PageServerLoad, Actions } from './$types';

export const load = (({ cookies }) => {
	console.log("Loading game, getting cookie");

	try {
		const game = new Game(cookies.get('sverdle'));

		const gameState = {
			/**
			 * The player's guessed words so far
			 */
			guesses: game.guesses,

			/**
			 * An array of strings like '__x_c' corresponding to the guesses, where 'x' means
			 * an exact match, and 'c' means a close match (right letter, wrong place)
			 */
			answers: game.answers,

			/**
			 * The correct answer, revealed if the game is over
			 */
			answer: game.answers.length >= 6 ? game.answer : null
		}

		console.log("Returning game state", gameState);

		return gameState
	} catch (e) {
		console.error("Error loading game state:", e);
		// Return a new game state as fallback
		const newGame = new Game();
		return {
			guesses: newGame.guesses,
			answers: newGame.answers,
			answer: null
		};
	}
}) satisfies PageServerLoad;

export const actions = {
	/**
	 * Modify game state in reaction to a keypress. If client-side JavaScript
	 * is available, this will happen in the browser instead of here
	 */
	update: async ({ request, cookies }) => {
		console.log("Updating game, getting cookie");
		const game = new Game(cookies.get('sverdle'));

		const data = await request.formData();
		const key = data.get('key');

		const i = game.answers.length;

		if (key === 'backspace') {
			game.guesses[i] = game.guesses[i].slice(0, -1);
		} else {
			game.guesses[i] += key;
		}

		const gameString = game.toString();
		console.log("Setting cookie", gameString);
		cookies.set('sverdle', gameString, { path: '/' });
	},

	/**
	 * Modify game state in reaction to a guessed word. This logic always runs on
	 * the server, so that people can't cheat by peeking at the JavaScript
	 */
	enter: async ({ request, cookies }) => {
		console.log("Entering guess, getting cookie");
		try {
			const game = new Game(cookies.get('sverdle'));

			const data = await request.formData();
			const guess = data.getAll('guess') as string[];

			if (!game.enter(guess)) {
				return fail(400, { badGuess: true });
			}

			const gameString = game.toString();
			console.log("Setting cookie", gameString);
			cookies.set('sverdle', gameString, { path: '/' });
		} catch (e) {
			console.log("Error entering guess", e);
		}
	},

	restart: async ({ cookies }) => {
		console.log("Restarting game, deleting cookie");
		cookies.delete('sverdle', { path: '/' });
	}
} satisfies Actions;
