// xcolor's base 20 dvipsnames-independent colors, plus a handful of the most common dvipsnames.
// completed inside \textcolor{...}, \color{...}, \pagecolor{...}, \colorbox{...}, etc.
export const COLOR_NAMES: string[] = [
	// xcolor base set (always available, no driver options needed)
	'red',
	'green',
	'blue',
	'cyan',
	'magenta',
	'yellow',
	'black',
	'white',
	'gray',
	'darkgray',
	'lightgray',
	'brown',
	'lime',
	'olive',
	'orange',
	'pink',
	'purple',
	'teal',
	'violet',
	// common dvipsnames (needs \usepackage[dvipsnames]{xcolor})
	'Maroon',
	'NavyBlue',
	'ForestGreen',
	'BurntOrange',
	'RoyalBlue',
	'RoyalPurple',
	'RedOrange',
	'SkyBlue',
	'Periwinkle',
	'Mahogany'
];
