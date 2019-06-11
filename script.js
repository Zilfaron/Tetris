window.addEventListener("load", () => {
	let store = {
		logState: {
			enable: false,
			once: false,
			interval: 4500
		},
		darkTheme: {
			bgColor: "#212121",
			gridColor: "#EDEDED"
		},
		lightTheme: {
			bgColor: "#ffffff",
			gridColor: "#1B1B1B"
		},
		canv: {
			elemSelector: ".game-area",
			width: 450,
			height: 900,
		},	
		fastFall: {
			pressed: false,
			speed: 60
		},
		gridCellSize: 50,
		gridColor: "#000000",
		gridViewEnabled: true,
		mainColor: "#ff0000",
		matrix: [],
		currentFigure: {
			templateMatrix: null,
			templateIndex: null,
			subTemplateIndex: null,
			width: null,
			height: null,
			row: 0,
			col: 0
		},
		speed: 1000,
		scores: 0,

		paused: false,
		set _paused(val) {
			this.paused = val;

			if (val === true) {
				document.title = "*PAUSED* Tetris";
			} else if (val === false) {
				document.title = "Tetris";
			}
		},

		figureTemplates: window.source.templates,
		figureColors: ["#00C4DE", "#4D00F0", "#F08200", "#CDF000", "#00CA00", "#A322F3"]
	};

	/* Processing some store properties */
	store.canv.height = window.innerHeight - 10;
	store.canv.width = store.canv.height / 2;
	store.gridCellSize = ~~( store.canv.width / 10 );

	if (store.canv.width % store.gridCellSize !== 0 || 
		store.canv.height % store.gridCellSize !== 0)
	{		 
		store.canv.width -= store.canv.width % store.gridCellSize;
		store.canv.height -= store.canv.height % store.gridCellSize;
	}

store.gridRows = store.canv.height / store.gridCellSize;
store.gridCols = store.canv.width / store.gridCellSize;
/* */	

	let wrapper = document.querySelector(".page-wrapper"),
			canv = document.querySelector(store.canv.elemSelector),
			ctx = canv.getContext("2d");

	[canv.width, canv.height] = [store.canv.width, store.canv.height];
	canv.style.display = "block"; // show canvas after loading

	/* Grid controls */
	let gridCheckbox = document.querySelector(".grid-view-checkbox");

	gridCheckbox.addEventListener("change", (evt) => {
		store.gridViewEnabled = evt.target.checked;
	});
	/* */

	/* Pause controls */
	window.addEventListener("keydown", (evt) => {
		if (evt.keyCode === 80) {
			store._paused = !store.paused;
		}
	});
	/* */

	/* Auto-pause after switch tab */
	window.addEventListener("blur", () => {
		store._paused = true;
	});
	/* */

	/* Dark theme */
	let darkThemeCheckbox = document.querySelector(".dark-theme-checkbox");
	
	darkThemeCheckbox.addEventListener("change", (evt) => {
		if (evt.target.checked) {
			wrapper.style.backgroundColor = store.darkTheme.bgColor; // page background
			store.gridColor = store.darkTheme.gridColor; // grid
			document.body.style.color = store.darkTheme.gridColor; // page font
			canv.style.borderColor = store.darkTheme.gridColor; // canvas element border
		} else {
			wrapper.style.backgroundColor = store.lightTheme.bgColor; // page background
			store.gridColor = store.lightTheme.gridColor; // grid
			document.body.style.color = ""; // page font
			canv.style.borderColor = store.lightTheme.gridColor; // canvas element border
		}
	});
	/* */

	/* Music */
	let musicBtn = document.querySelector(".music-btn"),
			musicVolume = document.querySelector(".music-volume-control"),
			audio = new Audio();

	audio.src = "Tetris.ogg";
	audio.paused = true;
	audio.loop = true;
	audio.volume = musicVolume.value;
	musicBtn.addEventListener("click", (evt) => {
		audio.paused ? audio.play() : audio.pause();
	});
	musicVolume.addEventListener("input", (evt) => {
		audio.volume = evt.target.value;
	});
	/* */

	let setClearMatrix = () => {
		store.matrix = Array(store.gridRows).fill(null).map( (row) => {
			return Array(store.gridCols).fill(null).map( (col) => 0 );
		} );
	};

	let setRandomTemplate = () => {
		let randomIndex = ~~( Math.random() * store.figureTemplates.length );

		while (randomIndex === store.currentFigure.templateIndex) {
			randomIndex = ~~( Math.random() * store.figureTemplates.length );
		}

		store.currentFigure.templateIndex = randomIndex;
		store.currentFigure.templateMatrix = store.figureTemplates[randomIndex][0].slice();

		store.currentFigure.subTemplateIndex = 0;

		store.currentFigure.width = store.currentFigure.templateMatrix[0].length;
		store.currentFigure.height = store.currentFigure.templateMatrix.length;
	};

	let clearFigure = (row, col) => {
		let targetRow = row === undefined ? store.currentFigure.row : row,
				targetCol = col === undefined ? store.currentFigure.col : col;

		store.currentFigure.templateMatrix.forEach( (row, rowIndex) => {
			row.forEach( (cellValue, colIndex) => {
				if (cellValue === 1) {
					let cellRow = targetRow + rowIndex,
							cellCol = targetCol + colIndex;

					store.matrix[cellRow][cellCol] = 0;		
				}
			} );
		} );
	};

	let setFigure = (row, col) => {
		let targetRow = row === undefined ? store.currentFigure.row : row,
				targetCol = col === undefined ? store.currentFigure.col : col;

		store.currentFigure.templateMatrix.forEach( (row, rowIndex) => {
			row.forEach( (cellValue, colIndex) => {
				if (cellValue === 1) {
					let cellRow = targetRow + rowIndex,
							cellCol = targetCol + colIndex;

					store.matrix[cellRow][cellCol] = store.figureColors[store.currentFigure.templateIndex];
				}
			} );
		} );				
	};

	let dropNewFigure = () => {
		if (store.finished) {
			return false;
		}

		/* check for full rows */
		let streak = 0;

		store.matrix.forEach( (row, rowIndex) => {
			if ( row.every( (cellValue) => typeof cellValue === "string" ) ) {
				store.matrix.splice(rowIndex, 1);

				createNewRow();

				store.scores += 100;
				streak += 1;
			}
		} );

		if (streak > 1) {
			store.scores += streak * 100;
		}

		document.querySelector(".scores").textContent = store.scores;
		/* */

		/* reset figure */
		setRandomTemplate();

		let randomCol = ~~( Math.random() * (store.gridCols - store.currentFigure.width + 1) );
		[store.currentFigure.row, store.currentFigure.col] = [0, randomCol];

		setFigure();
		/* */

		// if new figure already has obstacles reset game
		 if ( Object.values( checkObstacles() ).some( (val) => val ) ) {
			resetGame();
		}
	};

	// set template matrix from templates group by current indexes
	let setTemplateMatrix = () => {
		let sti = store.currentFigure.subTemplateIndex, // sub template index
				ti = store.currentFigure.templateIndex; // template index

		store.currentFigure.templateMatrix = store.figureTemplates[ti][sti].slice();

		/* update width and height */
		store.currentFigure.width = store.currentFigure.templateMatrix[0].length;
		store.currentFigure.height = store.currentFigure.templateMatrix.length;
		/* */

		if (store.currentFigure.height > store.currentFigure.width) {
			store.currentFigure.row -= 1;
			store.currentFigure.col += 1;

			/* Limit Y pos */
			if (store.currentFigure.row < 0) {
				store.currentFigure.row = 0;
			}
			/* */
		} else if (store.currentFigure.height < store.currentFigure.width) {
			store.currentFigure.row += 1;
			store.currentFigure.col -= 1;
		}
	};

	let toggleFigureRotation = () => {
		// number of rotation states of current templates group
		let subTemplates = store.figureTemplates[store.currentFigure.templateIndex].length;

		if (subTemplates > 1) {
			if (store.currentFigure.subTemplateIndex >= subTemplates - 1) {
				store.currentFigure.subTemplateIndex = 0;
			} else {
				store.currentFigure.subTemplateIndex += 1;
			}

			setTemplateMatrix();
		}
	};

	// Does not consider left and right borders of field
	let checkObstacles = () => { // NOTE: Obstacle - "Препятствие"
		let r = store.currentFigure.row,
				c = store.currentFigure.col;

		let onLeft = store.currentFigure.templateMatrix.some( (row, rowIndex) => {
			return typeof store.matrix[r + rowIndex][c + row.indexOf(1) - 1] === "string";
		} );

		let onRight = store.currentFigure.templateMatrix.some( (row, rowIndex) => {
			return typeof store.matrix[r + rowIndex][c + row.lastIndexOf(1) + 1] === "string";
		} );

		/* Below obstacles */
		let below = false;

		let lastRowsIndexes = Array(store.currentFigure.width).fill(null).map( () => 0 );
		store.currentFigure.templateMatrix.forEach( (row, rowIndex) => {
			row.forEach( (cellValue, colIndex) => {
				if (cellValue === 1) {
					lastRowsIndexes[colIndex] = rowIndex;
				 }	
			} );
		} );

		lastRowsIndexes.forEach( (index, colIndex) => {
			if (below) { // if result is already computed
				return;
			}

			let isExist = store.matrix[r + index + 1] !== undefined; // existing of next row
			if (!isExist) {
				below = true;
				return;
			}

			if ( typeof store.matrix[r + index + 1][c + colIndex] === "string" ) {
				below = true;
			}
		} );
		/* */

		// where are obstacles relative current figure
		return {
			onLeft,
			onRight,
			below
		};
	};

	let drawMatrix = () => {
		let cellSize = store.gridCellSize;

		store.matrix.forEach( (row, rowIndex) => {
			row.forEach( (cellValue, colIndex) => {
				if (cellValue !== 0 && typeof cellValue === "string" && cellValue.charAt(0) === "#") {
					ctx.beginPath();
					ctx.fillStyle = cellValue;
					ctx.fillRect(colIndex * cellSize, rowIndex * cellSize, cellSize, cellSize);
				}
			} );
		} );
	};

	let createNewRow = () => {
		let clearRow = Array(store.gridCols).fill(null).map( (cellValue) => 0 );

		store.matrix.unshift(clearRow);
	};

	let spawnGrid = () => {
		let cellSize = store.gridCellSize;

		for (let rowIndex = 0; rowIndex < store.gridRows; rowIndex++) {
			for (let colIndex = 0; colIndex < store.gridCols; colIndex++) {
				ctx.beginPath();
				ctx.lineWidth = 0.5;
				ctx.strokeStyle = store.gridColor;
				ctx.strokeRect(colIndex * cellSize, rowIndex * cellSize, cellSize, cellSize);
				ctx.closePath();
			}
		}
	};			

	let renderLoop = () => {
		ctx.clearRect(0, 0, store.canv.width, store.canv.height);
		drawMatrix();
		
		if (store.gridViewEnabled) {
			spawnGrid();
		}	

		requestAnimationFrame(renderLoop);
	};

	let initializeControls = () => {
		let fallInterval = setInterval( () => {
			if (!store.fastFall.pressed || store.paused) {
				return false;
			}	

			if (checkObstacles().below) {
				dropNewFigure();						

				return true;
			}

			clearFigure();
			store.currentFigure.row += 1;
			setFigure();
		}, store.fastFall.speed );

		window.addEventListener("keydown", (evt) => {
			if (evt.keyCode === 40 && !store.paused) { // ArrowDown
				store.fastFall.pressed = true;
			}			
		});

		window.addEventListener("keyup", (evt) => {
			if (evt.keyCode === 40) { // ArrowDown
				store.fastFall.pressed = false;
			}
		});


		let keys = [37, 39, 82];
		window.addEventListener("keydown", (evt) => {
			if ( !keys.includes(evt.keyCode) || store.paused ) {
				return false;
			}

			let obstacles = checkObstacles();

			clearFigure();

			switch (evt.keyCode) {
				case 37: // ArrowLeft
					if (obstacles.onLeft) {
						setFigure();
						dropNewFigure();

						return true;
					}

					store.currentFigure.col -= 1;
				break;
				case 39: // ArrowRight
					if (obstacles.onRight) {
						setFigure();
						dropNewFigure();						

						return true;
					}

					store.currentFigure.col += 1;
				break;
				case 82: // R
					toggleFigureRotation();
				break;
				default: 
					return false;	
			}

			/* Limit col */
			if (store.currentFigure.col <= 0) {
				store.currentFigure.col = 0;
			} else if (store.currentFigure.col >= store.gridCols - store.currentFigure.width) {
				store.currentFigure.col = store.gridCols - store.currentFigure.width;
			}
			/* */

			setFigure();
		});
	};

	let actionLoop = () => {
		if (!store.fastFall.pressed && !store.paused) {
			if ( checkObstacles().below ) {
				dropNewFigure();
			} else {
				clearFigure();
				store.currentFigure.row += 1;
				setFigure();
			}
		}	
	};

	let actionLoopInterval = null;

	let resetGame = () => {
		console.log(`You lose, scores: ${store.scores}`);
		store.scores = 0;

		setClearMatrix();
		dropNewFigure();

		clearInterval(actionLoopInterval);
		actionLoopInterval = setInterval( actionLoop, store.speed );
	};

	let initializeLifeLoop = () => {
		setClearMatrix();
		renderLoop();
		initializeControls();
		dropNewFigure();
		
		actionLoopInterval = setInterval( actionLoop, store.speed );

		// debug
		if (store.logState.enable) {
			let logStateInterval = setInterval( () => {
				console.log(store.matrix);
				
				if (store.logState.once) {
					clearInterval(logStateInterval);
				}
			}, store.logState.interval );
		}		
	};

	initializeLifeLoop();
});