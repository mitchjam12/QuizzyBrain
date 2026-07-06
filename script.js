/**
 * QuizzyBrain Core Application Architecture Module
 */

// ================= DATA DEPOSITORIES (12 Unique Questions per Category) =================
const QUIZ_BANKS = {
    "Sports Players": [
        { q: "Who has won the most Ballon d'Or awards in football history?", a: ["Lionel Messi", "Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"], c: 0, d: "Easy" },
        { q: "Which NBA player is known as 'The King'?", a: ["Kevin Durant", "Stephen Curry", "LeBron James", "Giannis Antetokounmpo"], c: 2, d: "Easy" },
        { q: "How many Grand Slam singles titles has Serena Williams won?", a: ["21", "22", "23", "25"], c: 2, d: "Medium" },
        { q: "Who is the all-time leading run-scorer in international cricket?", a: ["Ricky Ponting", "Sachin Tendulkar", "Brian Lara", "Virat Kohli"], c: 1, d: "Medium" },
        { q: "Which swimmer holds the record for most Olympic gold medals?", a: ["Michael Phelps", "Mark Spitz", "Ryan Lochte", "Ian Thorpe"], c: 0, d: "Easy" },
        { q: "Who was the first gymnastics athlete to score a perfect 10 at the Olympics?", a: ["Simone Biles", "Nadia Comăneci", "Svetlana Khorkina", "Mary Lou Retton"], c: 1, d: "Medium" },
        { q: "Which formula 1 driver has the most race victories in history?", a: ["Michael Schumacher", "Ayrton Senna", "Lewis Hamilton", "Sebastian Vettel"], c: 2, d: "Easy" },
        { q: "What athlete is nicknamed 'The Lightning Bolt'?", a: ["Asafa Powell", "Usain Bolt", "Tyson Gay", "Yohan Blake"], c: 1, d: "Easy" },
        { q: "Which NHL player is widely known simply as 'The Great One'?", a: ["Wayne Gretzky", "Mario Lemieux", "Sidney Crosby", "Alex Ovechkin"], c: 0, d: "Easy" },
        { q: "Who was the youngest undisputed heavyweight boxing champion?", a: ["Muhammad Ali", "Joe Frazier", "Mike Tyson", "Evander Holyfield"], c: 2, d: "Medium" },
        { q: "Which female tennis player completed a Golden Slam in 1988?", a: ["Steffi Graf", "Martina Navratilova", "Chris Evert", "Margaret Court"], c: 0, d: "Expert" },
        { q: "Who was the first MMA fighter to hold UFC championships in two weight classes simultaneously?", a: ["Jon Jones", "Anderson Silva", "Conor McGregor", "Khabib Nurmagomedov"], c: 2, d: "Medium" }
    ],
    "Sports": [
        { q: "How long is a standard professional football match?", a: ["80 mins", "90 mins", "100 mins", "120 mins"], c: 1, d: "Easy" },
        { q: "Which sport uses a shuttlecock?", a: ["Tennis", "Badminton", "Squash", "Table Tennis"], c: 1, d: "Easy" },
        { q: "In golf, what term describes scoring two strokes under par on a hole?", a: ["Bogey", "Birdie", "Eagle", "Albatross"], c: 2, d: "Medium" },
        { q: "How many players are on the field for one team in a cricket match?", a: ["9", "10", "11", "12"], c: 2, d: "Easy" },
        { q: "Which country won the first ever FIFA World Cup in 1930?", a: ["Argentina", "Brazil", "Italy", "Uruguay"], c: 3, d: "Hard" },
        { q: "What is the length of an Olympic swimming pool?", a: ["25m", "50m", "75m", "100m"], c: 1, d: "Easy" },
        { q: "In baseball, how many strikes equal an out?", a: ["2", "3", "4", "5"], c: 1, d: "Easy" },
        { q: "The modern Olympic games were revived in which city in 1896?", a: ["Rome", "Paris", "Athens", "London"], c: 2, d: "Medium" },
        { q: "Which international cycling race features a 'Yellow Jersey' for its leader?", a: ["Giro d'Italia", "Vuelta a España", "Tour de France", "Paris-Roubaix"], c: 2, d: "Easy" },
        { q: "What is the only sport to have been played on the Moon?", a: ["Golf", "Tennis", "Baseball", "Frisbee"], c: 0, d: "Hard" },
        { q: "How high is a regulation NBA basketball hoop?", a: ["9 feet", "10 feet", "11 feet", "12 feet"], c: 1, d: "Medium" },
        { q: "In Rugby Union, how many points is a basic 'Try' worth before conversion?", a: ["4", "5", "6", "7"], c: 1, d: "Hard" }
    ],
    "Food": [
        { q: "What is the main aromatic herb used to make classic pesto sauce?", a: ["Parsley", "Basil", "Oregano", "Mint"], c: 1, d: "Easy" },
        { q: "Which country is the global origin place of French Fries?", a: ["France", "Belgium", "USA", "Germany"], c: 1, d: "Medium" },
        { q: "What primary leavening agent causes bread dough to rise?", a: ["Baking Soda", "Baking Powder", "Yeast", "Cream of Tartar"], c: 2, d: "Easy" },
        { q: "Which spice is the most expensive in the world by weight?", a: ["Saffron", "Vanilla Beans", "Cardamom", "Cinnamon"], c: 0, d: "Medium" },
        { q: "From what animal milk is authentic Roquefort cheese produced?", a: ["Cow", "Goat", "Sheep", "Buffalo"], c: 2, d: "Hard" },
        { q: "What fruit ingredient is utilized to flavor the traditional liqueur Cointreau?", a: ["Orange", "Lemon", "Cherry", "Apple"], c: 0, d: "Medium" },
        { q: "What is the national dish of Spain known for its saffron rice base?", a: ["Risotto", "Paella", "Couscous", "Jambalaya"], c: 1, d: "Easy" },
        { q: "Which food item is traditionally wrapped around Japanese Sushi rolls?", a: ["Nori", "Kombu", "Wakame", "Rice Paper"], c: 0, d: "Easy" },
        { q: "What gives the distinct green paste 'Wasabi' its intense sharp heat style?", a: ["Capsaicin", "Allyl Isothiocyanate", "Piperine", "Oxalic Acid"], c: 1, d: "Expert" },
        { q: "Which nut is the foundational core base item of Marzipan paste?", a: ["Walnut", "Hazelnut", "Pistachio", "Almond"], c: 3, d: "Medium" },
        { q: "What technical baking term describes cutting fat into flour until tiny crumbs form?", a: ["Kneading", "Rubbing-in", "Creaming", "Folding"], c: 1, d: "Hard" },
        { q: "Scoville units are a scale metric measurement used to quantify what attribute?", a: ["Sugar Sweetness", "Sour Acidity", "Chili Heat Pungency", "Salt Salinity"], c: 2, d: "Easy" }
    ],
    "Countries": [
        { q: "Which nation occupies the largest landmass territory on planet Earth?", a: ["Canada", "China", "USA", "Russia"], c: 3, d: "Easy" },
        { q: "What is the official capital city of Australia?", a: ["Sydney", "Melbourne", "Canberra", "Brisbane"], c: 2, d: "Easy" },
        { q: "Which country has the highest population count in Africa?", a: ["Egypt", "Nigeria", "South Africa", "Ethiopia"], c: 1, d: "Medium" },
        { q: "What landlocked country is located entirely inside the borders of South Africa?", a: ["Lesotho", "Eswatini", "Botswana", "Namibia"], c: 0, d: "Hard" },
        { q: "Which European nation is geographically defined by its layout shaped like a boot?", a: ["Greece", "Spain", "Italy", "Portugal"], c: 2, d: "Easy" },
        { q: "Which South American nation boasts the longest longitudinal coastline length?", a: ["Brazil", "Peru", "Argentina", "Chile"], c: 3, d: "Medium" },
        { q: "What country is nicknamed the 'Land of the Rising Sun'?", a: ["China", "Japan", "South Korea", "Thailand"], c: 1, d: "Easy" },
        { q: "How many individual islands make up the nation of Indonesia?", a: ["Approx 3,000", "Approx 7,000", "Approx 17,500", "Approx 25,000"], c: 2, d: "Expert" },
        { q: "Ulaanbaatar is the official capital city of which country?", a: ["Mongolia", "Kazakhstan", "Uzbekistan", "Nepal"], c: 0, d: "Medium" },
        { q: "Which country shares the longest international land border boundary with the USA?", a: ["Mexico", "Russia", "Canada", "Cuba"], c: 2, d: "Easy" },
        { q: "In which country can you visit the ancient historical ruins of Machu Picchu?", a: ["Colombia", "Peru", "Bolivia", "Ecuador"], c: 1, d: "Easy" },
        { q: "Which country possesses the most natural structural lakes globally?", a: ["USA", "Brazil", "Canada", "Finland"], c: 2, d: "Hard" }
    ],
    "Video Games": [
        { q: "What is the best-selling standalone video game of all time?", a: ["GTA V", "Tetris", "Minecraft", "Wii Sports"], c: 2, d: "Easy" },
        { q: "What year did the original Nintendo Entertainment System (NES) launch in North America?", a: ["1983", "1985", "1987", "1989"], c: 1, d: "Hard" },
        { q: "Who is the main protagonist of the 'Halo' sci-fi franchise?", a: ["Marcus Fenix", "Doom Slayer", "Master Chief", "Commander Shepard"], c: 2, d: "Easy" },
        { q: "What is the name of the fictional setting kingdom in The Legend of Zelda?", a: ["Azeroth", "Tamriel", "Hyrule", "Eorzea"], c: 2, d: "Easy" },
        { q: "Which company created the digital distribution ecosystem marketplace Steam?", a: ["Epic Games", "EA", "Valve", "Blizzard"], c: 2, d: "Easy" },
        { q: "In 'Pac-Man', what is the name of the orange ghost character?", a: ["Blinky", "Pinky", "Inky", "Clyde"], c: 3, d: "Medium" },
        { q: "What game studio developed the 2015 RPG masterpiece 'The Witcher 3: Wild Hunt'?", a: ["Bethesda", "BioWare", "CD Projekt Red", "Ubisoft"], c: 2, d: "Medium" },
        { q: "What was the original working development title prototype name for character Mario?", a: ["Jumpman", "Plumber Boy", "Red Cap", "Mr. Video"], c: 0, d: "Medium" },
        { q: "Which video game popularized the 'Battle Royale' genre on a massive global scale first?", a: ["Apex Legends", "PUBG", "Fortnite", "H1Z1"], c: 1, d: "Medium" },
        { q: "What asset must players collect to power their devices in 'Fallout'?", a: ["Plasma Core", "Fusion Core", "Microfusion Cell", "Capacitor Module"], c: 1, d: "Hard" },
        { q: "What is the name of the final ultimate dimension zone housing the Ender Dragon in Minecraft?", a: ["The Nether", "The Aether", "The Void", "The End"], c: 3, d: "Easy" },
        { q: "Which fighting game franchise contains the quote 'Finish Him!'?", a: ["Street Fighter", "Tekken", "Mortal Kombat", "Soulcalibur"], c: 2, d: "Easy" }
    ],
    "Board Games": [
        { q: "How many spaces are there on a standard classic Monopoly board?", a: ["36", "40", "44", "48"], c: 1, d: "Medium" },
        { q: "What color configuration are the layout tiles of a standard Chess board?", a: ["Black and Red", "White and Black", "Brown and Tan", "Blue and White"], c: 1, d: "Easy" },
        { q: "In Settlers of Catan, which resource is combined with wheat to build a development card?", a: ["Sheep/Wool", "Ore", "Brick", "Wood/Lumber"], c: 0, d: "Medium" },
        { q: "How many letter tiles are present in an official English Scrabble box?", a: ["98", "100", "102", "104"], c: 1, d: "Hard" },
        { q: "Which board game requires players to track a murderer using clues like a wrench or lead pipe?", a: ["Risk", "Clue / Cluedo", "Stratego", "Battleship"], c: 1, d: "Easy" },
        { q: "What is the primary overarching mechanic objective goal of the game pandemic?", a: ["Conquer land", "Accumulate money", "Cure global diseases", "Build a rail network"], c: 2, d: "Easy" },
        { q: "How many dice are rolled simultaneously by an active player in Yahtzee?", a: ["4", "5", "6", "7"], c: 1, d: "Easy" },
        { q: "In the game of Risk, what is the base reinforcement draft bonus value for holding Australia?", a: ["2", "3", "4", "5"], c: 0, d: "Medium" },
        { q: "What ancient strategy game involves placement of black and white stones on a 19x19 line grid?", a: ["Chess", "Checkers", "Go", "Mahjong"], c: 2, d: "Medium" },
        { q: "Which game features custom block components structured in an active tower stack layout configuration?", a: ["Jenga", "Kerplunk", "Connect Four", "Blokus"], c: 0, d: "Easy" },
        { q: "What modern tile placement eurogame centers around building French fortresses and roads?", a: ["Ticket to Ride", "Carcassonne", "Agricola", "7 Wonders"], c: 1, d: "Medium" },
        { q: "What is the highest value point tile piece possible in a Scrabble game?", a: ["Z and Q", "X and Z", "Q and E", "K and J"], c: 0, d: "Hard" }
    ],
    "Emoji Quiz": [
        { q: "What title is implied: 👑🦁?", a: ["The Jungle Book", "The Lion King", "Madagascar", "Tarzan"], c: 1, d: "Easy" },
        { q: "Decode this destination: 🗼🥖🍷?", a: ["London", "Rome", "Paris", "Madrid"], c: 2, d: "Easy" },
        { q: "Identify the sci-fi movie: 🦖🏝️🦕?", a: ["King Kong", "Jurassic Park", "Avatar", "Godzilla"], c: 1, d: "Easy" },
        { q: "What is this weather action: ⚡⛈️🌧️?", a: ["Tornado", "Thunderstorm", "Blizzard", "Hurricane"], c: 1, d: "Easy" },
        { q: "What hidden phrase is this: ⏰🐷✈️?", a: ["Time flies", "When pigs fly", "Early bird", "Flying high"], c: 1, d: "Medium" },
        { q: "Guess the video game title: 🟩⛏️🧱?", a: ["Tetris", "Minecraft", "Roblox", "Terraria"], c: 1, d: "Easy" },
        { q: "Decode the classic book story: 🐋⛵🌊?", a: ["Treasure Island", "Moby Dick", "The Odyssey", "Robinson Crusoe"], c: 1, d: "Medium" },
        { q: "Identify the iconic global landmark artist painter: 👨‍🎨🎨👂?", a: ["Picasso", "Da Vinci", "Van Gogh", "Monet"], c: 2, d: "Medium" },
        { q: "What popular song track title is this: 👁️🐯?", a: ["Eye of the Tiger", "Roar", "Animal", "Wild Ones"], c: 0, d: "Easy" },
        { q: "Identify the historic space event: 👨‍🚀🚀🌕?", a: ["Apollo 11 Moon Landing", "Mars Rover Launch", "ISS Assembly", "Sputnik Orbit"], c: 0, d: "Easy" },
        { q: "Decode this common idiom saying: 🐱💧🌧️?", a: ["Raining cats and dogs", "Curiosity killed the cat", "Cat got your tongue", "Let the cat out"], c: 0, d: "Easy" },
        { q: "Identify the classic fairytale story profile: 🍎👧🧝‍♂️?", a: ["Cinderella", "Snow White", "Rapunzel", "Sleeping Beauty"], c: 1, d: "Easy" }
    ],
    "Books": [
        { q: "Who wrote the 1984 dystopian masterpiece novel?", a: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"], c: 1, d: "Easy" },
        { q: "What is the name of the main fictional wizard academy school in Harry Potter?", a: ["Durmstrang", "Beauxbatons", "Hogwarts", "Ilvermorny"], c: 2, d: "Easy" },
        { q: "How many lines comprise a traditional sonnet poetic structural configuration?", a: ["10", "12", "14", "16"], c: 2, d: "Medium" },
        { q: "Who authored the classic epic adventure romance novel 'The Hobbit'?", a: ["C.S. Lewis", "J.R.R. Tolkien", "George R.R. Martin", "Christopher Paolini"], c: 1, d: "Easy" },
        { q: "What is the opening iconic sentence line phrase of Herman Melville's Moby Dick?", a: ["Call me Ishmael.", "It was a dark night.", "I am Jonah.", "The sea was wild."], c: 0, d: "Hard" },
        { q: "Which tragic Shakespeare play features the rival families Capulet and Montague?", a: ["Hamlet", "Macbeth", "Othello", "Romeo and Juliet"], c: 3, d: "Easy" },
        { q: "Who created the legendary deduction detective investigator character Sherlock Holmes?", a: ["Agatha Christie", "Arthur Conan Doyle", "Edgar Allan Poe", "Wilkie Collins"], c: 1, d: "Easy" },
        { q: "What American literary classic details the high society life adventures of Jay Gatsby?", a: ["The Great Gatsby", "To Kill a Mockingbird", "The Grapes of Wrath", "Of Mice and Men"], c: 0, d: "Easy" },
        { q: "What was the pen name identity utilized by author Mary Ann Evans?", a: ["George Eliot", "Jane Austen", "Charlotte Brontë", "Virginia Woolf"], c: 0, d: "Hard" },
        { q: "In 'The Chronicles of Narnia', who or what is Aslan?", a: ["A Centaur", "A King", "A Lion", "A Wizard"], c: 2, d: "Easy" },
        { q: "Which classic gothic horror novel features an existential monster assembled from corpses?", a: ["Dracula", "Frankenstein", "The Mummy", "Dr. Jekyll and Mr. Hyde"], c: 1, d: "Easy" },
        { q: "What is the primary theme setting location name of the Hunger Games trilogy arena?", a: ["Panem", "Gilead", "Oceana", "Divergia"], c: 0, d: "Easy" }
    ],
    "Movie Characters": [
        { q: "What is the true alter-ego civilian identity name of Marvel's Iron Man?", a: ["Bruce Banner", "Tony Stark", "Steve Rogers", "Peter Parker"], c: 1, d: "Easy" },
        { q: "Which actor portrayed Captain Jack Sparrow in the Pirates of the Caribbean series?", a: ["Brad Pitt", "Johnny Depp", "Tom Cruise", "Orlando Bloom"], c: 1, d: "Easy" },
        { q: "What is the name of the green evaluation monster character in Shrek?", a: ["Shrek", "Donkey", "Fiona", "Farquaad"], c: 0, d: "Easy" },
        { q: "Who is the legendary Dark Lord antagonist master villain of the Star Wars universe?", a: ["Luke Skywalker", "Darth Vader", "Han Solo", "Obi-Wan Kenobi"], c: 1, d: "Easy" },
        { q: "What character states: 'Why so serious?' in the 2008 film The Dark Knight?", a: ["Batman", "Two-Face", "The Joker", "Bane"], c: 2, d: "Easy" },
        { q: "What is the name of the cowboy doll character in Pixar's Toy Story?", a: ["Buzz", "Woody", "Slinky", "Rex"], c: 1, d: "Easy" },
        { q: "Which archeologist fictional character carries an iconic bullwhip tool?", a: ["Lara Croft", "Nathan Drake", "Indiana Jones", "Rick O'Connell"], c: 2, d: "Easy" },
        { q: "What is the name of the friendly, helper healthcare robot in Big Hero 6?", a: ["Wall-E", "Baymax", "Rodney", "Optimus"], c: 1, d: "Easy" },
        { q: "Who is the central character ring bearer protagonist of Lord of the Rings?", a: ["Frodo Baggins", "Samwise Gamgee", "Aragorn", "Legolas"], c: 0, d: "Easy" },
        { q: "What character is known as Agent 007 in British intelligence spy thrillers?", a: ["Jason Bourne", "Ethan Hunt", "James Bond", "Jack Reacher"], c: 2, d: "Easy" },
        { q: "What is the name of the majestic lion cub prince protagonist character in The Lion King?", a: ["Mufasa", "Scar", "Simba", "Nala"], c: 2, d: "Easy" },
        { q: "Which character is the loyal, furry Wookiee co-pilot of the Millennium Falcon?", a: ["Yoda", "Chewbacca", "Bobafett", "Jabba"], c: 1, d: "Easy" }
    ],
    "Random Challenge": [
        { q: "What is the exact chemical element symbol for Gold on the periodic table?", a: ["Ag", "Au", "Fe", "Pb"], c: 1, d: "Easy" },
        { q: "How many bones are in a normal adult human skeletal framework anatomy?", a: ["106", "206", "306", "406"], c: 1, d: "Medium" },
        { q: "What planet in our solar system is known for its prominent system rings?", a: ["Mars", "Jupiter", "Saturn", "Neptune"], c: 2, d: "Easy" },
        { q: "What is the approximate speed of light through a vacuum space environment?", a: ["30,000 km/s", "300,000 km/s", "3,000,000 km/s", "300 km/s"], c: 1, d: "Medium" },
        { q: "Which country gifted the historic Statue of Liberty monument to the USA?", a: ["Great Britain", "France", "Germany", "Italy"], c: 1, d: "Easy" },
        { q: "What is the longest river channel located on planet earth?", a: ["Amazon", "Nile", "Mississippi", "Yangtze"], c: 1, d: "Medium" },
        { q: "How many time zone lines split up the world space chart framework?", a: ["12", "24", "36", "48"], c: 1, d: "Easy" },
        { q: "What is the primary gas component constituent making up Earth's atmosphere?", a: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"], c: 1, d: "Medium" },
        { q: "Which historic explorer led the maritime fleet crew that completed global circumnavigation first?", a: ["Christopher Columbus", "Ferdinand Magellan", "Vasco da Gama", "James Cook"], c: 1, d: "Hard" },
        { q: "What geometric shape value name describes an internal angle measurement of exactly 90 degrees?", a: ["Acute", "Obtuse", "Right Angle", "Reflex"], c: 2, d: "Easy" },
        { q: "What structural software computer core kernel layer manages interface requests?", a: ["Operating System", "RAM", "CPU", "Motherboard"], c: 0, d: "Medium" },
        { q: "How many hearts does an octopus possess inside its biological structural layout?", a: ["1", "2", "3", "4"], c: 2, d: "Hard" }
    ],
    "Australian Geography": [
        { q: "What is the capital city of Australia?", a: ["Sydney", "Melbourne", "Canberra", "Brisbane"], c: 2, d: "Easy" },
        { q: "Which Australian state is known as the Sunshine State?", a: ["Victoria", "Queensland", "Tasmania", "Western Australia"], c: 1, d: "Easy" },
        { q: "Which city is home to the Sydney Opera House?", a: ["Perth", "Sydney", "Adelaide", "Canberra"], c: 1, d: "Easy" },
        { q: "What is the largest Australian state by area?", a: ["Queensland", "South Australia", "Western Australia", "New South Wales"], c: 2, d: "Medium" },
        { q: "Which Australian territory contains Uluru?", a: ["Australian Capital Territory", "Northern Territory", "Queensland", "Western Australia"], c: 1, d: "Medium" },
        { q: "What is the capital of Tasmania?", a: ["Launceston", "Devonport", "Burnie", "Hobart"], c: 3, d: "Easy" },
        { q: "Which reef system lies off the coast of Queensland?", a: ["Ningaloo Reef", "Great Barrier Reef", "Coral Sea Reef", "Ribbon Reef"], c: 1, d: "Easy" },
        { q: "Which Australian city hosted the 2000 Olympic Games?", a: ["Melbourne", "Brisbane", "Sydney", "Perth"], c: 2, d: "Easy" },
        { q: "How many states are there in Australia?", a: ["5", "6", "7", "8"], c: 1, d: "Medium" },
        { q: "Which river is Australia's longest?", a: ["Darling River", "Murray River", "Swan River", "Yarra River"], c: 1, d: "Hard" },
        { q: "What is the capital city of Western Australia?", a: ["Darwin", "Perth", "Adelaide", "Albany"], c: 1, d: "Easy" },
        { q: "Which state borders every mainland Australian state and the Northern Territory?", a: ["Queensland", "Victoria", "South Australia", "New South Wales"], c: 2, d: "Hard" }
    ]
};

// Category Configuration Registry
const CATEGORY_METADATA = {
    "Sports Players": { icon: "🏆", desc: "Test your knowledge of legendary athletes across all global sports.", time: "4 mins" },
    "Sports": { icon: "⚽", desc: "Rules, records, and iconic tournaments from around the sports world.", time: "3 mins" },
    "Food": { icon: "🍕", desc: "A gourmet trip through culinary traditions, spices, and global dishes.", time: "4 mins" },
    "Countries": { icon: "🌍", desc: "Explore geography, world capitals, borders, and unique cultures.", time: "3 mins" },
    "Video Games": { icon: "🎮", desc: "From retro arcade classics to modern triple-A gaming masterpieces.", time: "4 mins" },
    "Board Games": { icon: "🎲", desc: "Strategy classics, modern tabletop hits, and dice-rolling lore.", time: "4 mins" },
    "Emoji Quiz": { icon: "😂", desc: "Decode pop culture idioms, titles, and movies hidden in emojis.", time: "3 mins" },
    "Books": { icon: "📚", desc: "Journey through classic literature, modern novels, and poetry.", time: "4 mins" },
    "Movie Characters": { icon: "🎬", desc: "Identify cinematic icons, pop-culture heroes, and villains.", time: "3 mins" },
    "Random Challenge": { icon: "🧩", desc: "An unpredictable mix of science, history, pop culture, and trivia.", time: "4 mins" }
};

// Achievement Definition Bank
const ACHIEVEMENTS_REGISTRY = [
    { id: "first_quiz", title: "🏆 First Quiz", desc: "Complete any quiz category.", condition: s => s.gamesPlayed >= 1 },
    { id: "perfect_score", title: "⭐ Perfect Score", desc: "Get 12/12 on any quiz.", condition: s => s.maxStreak >= 12 },
    { id: "speed_demon", title: "⚡ Speed Demon", desc: "Finish a quiz in under 30 seconds.", condition: s => s.fastestTime < 30 },
    { id: "bookworm", title: "📚 Bookworm", desc: "Complete the Books category.", condition: s => s.completedCats.includes("Books") },
    { id: "gamer", title: "🎮 Gamer", desc: "Complete the Video Games category.", condition: s => s.completedCats.includes("Video Games") },
    { id: "explorer", title: "🌍 Explorer", desc: "Complete the Countries category.", condition: s => s.completedCats.includes("Countries") },
    { id: "food_expert", title: "🍕 Food Expert", desc: "Complete the Food category.", condition: s => s.completedCats.includes("Food") },
    { id: "emoji_genius", title: "😂 Emoji Genius", desc: "Complete the Emoji Quiz category.", condition: s => s.completedCats.includes("Emoji Quiz") },
    { id: "quiz_champ", title: "🏅 Quiz Champion", desc: "Answer 100 total questions correctly.", condition: s => s.totalCorrect >= 100 }
];

// ================= GLOBAL APPLICATION STATE =================
let state = {
    userStats: {
        gamesPlayed: 0,
        totalAnswered: 0,
        totalCorrect: 0,
        maxStreak: 0,
        favCategory: "N/A",
        fastestTime: Number.MAX_SAFE_INTEGER, // sentinel "no time yet" value (Infinity doesn't survive JSON.stringify -> becomes null)
        completedCats: [],
        catCounts: {},
        unlockedAchievements: []
    },
    activeQuiz: {
        category: null,
        difficulty: "all",
        questions: [],
        currentIdx: 0,
        score: 0,
        streak: 0,
        maxStreakThisRun: 0,
        startTime: null,
        timerVal: 15,
        timerId: null,
        isDaily: false
    }
};

// ================= NATIVE SYNTHESIZED WEB AUDIO ENGINE =================
const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play(type) {
        if (!document.getElementById("toggle-sound").checked) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === "click") {
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === "correct") {
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === "wrong") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.2);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === "victory") {
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            osc.frequency.setValueAtTime(1046.50, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        }
    }
};

// ================= APPLICATION CORE ENGINE INITS =================
document.addEventListener("DOMContentLoaded", () => {
    const steps = [
        loadProgressFromStorage,
        renderParticleBackground,
        renderCategoryGrid,
        setupCoreEventListeners,
        updateDashboardDisplays,
        initDailyChallengeEngine
    ];
    steps.forEach(step => {
        try { step(); } catch (e) { console.error(`QuizzyBrain startup step "${step.name}" failed:`, e); }
    });
});

// ================= STORAGE MANAGEMENT INTERFACE =================
function loadProgressFromStorage() {
    let saved = null;
    try {
        saved = localStorage.getItem("quizzybrain_userdata");
    } catch (e) {
        console.warn("localStorage unavailable in this context; stats won't persist.", e);
        return;
    }
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Guard against older saves where fastestTime was corrupted to null by JSON.stringify(Infinity)
            if (typeof parsed.fastestTime !== "number") parsed.fastestTime = Number.MAX_SAFE_INTEGER;
            state.userStats = { ...state.userStats, ...parsed };
        } catch (e) { console.error("Failed to load saved stats from localStorage, starting fresh.", e); }
    }
}

function saveProgressToStorage() {
    try {
        localStorage.setItem("quizzybrain_userdata", JSON.stringify(state.userStats));
    } catch (e) {
        console.warn("localStorage unavailable in this context; progress won't be saved.", e);
    }
}

// ================= CANVAS PARTICLE ENGINE INTERFACE =================
function renderParticleBackground() {
    const canvas = document.getElementById("particle-canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.warn("Canvas 2D context unavailable; skipping decorative particle background.");
        return;
    }
    let particles = [];
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 4 + 2,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            color: Math.random() > 0.5 ? 'rgba(74, 119, 255, 0.15)' : 'rgba(157, 78, 221, 0.12)'
        });
    }

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        requestAnimationFrame(loop);
    }
    loop();
}

// ================= RENDER DYNAMIC COMPONENT INTERFACES =================
function renderCategoryGrid(filterTerm = "", diffFilter = "all") {
    const targetGrid = document.getElementById("categories-grid");
    targetGrid.innerHTML = "";
    
    Object.keys(QUIZ_BANKS).forEach(catName => {
        const meta = CATEGORY_METADATA[catName];
        
        // Search Filter Execution
        if (filterTerm && !catName.toLowerCase().includes(filterTerm.toLowerCase()) && !meta.desc.toLowerCase().includes(filterTerm.toLowerCase())) {
            return;
        }

        // Difficulty filter optimization strategy execution check
        let questionsGroup = QUIZ_BANKS[catName];
        if (diffFilter !== "all") {
            questionsGroup = questionsGroup.filter(q => q.d === diffFilter);
        }
        
        // Skip visualization if difficulty has 0 questions
        if (questionsGroup.length === 0) return;

        const card = document.createElement("div");
        card.className = "glass-panel category-card";
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Play ${catName} Category. 12 questions. Duration ${meta.time}`);

        card.innerHTML = `
            <div class="cat-icon-frame">${meta.icon}</div>
            <h3>${catName}</h3>
            <p>${meta.desc}</p>
            <div class="cat-meta-footer">
                <span>📋 12 Qs</span>
                <span>⚡ ${diffFilter === 'all' ? 'Mixed' : diffFilter}</span>
                <span>⏱️ ${meta.time}</span>
            </div>
        `;
        card.style.animationDelay = `${targetGrid.children.length * 60}ms`;

        // Interactivity Bindings
        const startQuizAction = () => { AudioEngine.play("click"); initQuizEngine(catName, diffFilter); };
        card.addEventListener("click", startQuizAction);
        card.addEventListener("keydown", (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startQuizAction(); } });

        targetGrid.appendChild(card);
    });

    if (targetGrid.children.length === 0) {
        targetGrid.innerHTML = `<p class="grid-empty-state-text">No category assets match your active filter matrix parameters.</p>`;
    }
}

function updateDashboardDisplays() {
    // Stats Matrix Render
    document.getElementById("stat-games").innerText = state.userStats.gamesPlayed;
    const acc = state.userStats.totalAnswered > 0 ? Math.round((state.userStats.totalCorrect / state.userStats.totalAnswered) * 100) : 0;
    document.getElementById("stat-accuracy").innerText = `${acc}%`;
    document.getElementById("stat-streak").innerText = state.userStats.maxStreak;
    document.getElementById("stat-fav").innerText = state.userStats.favCategory;

    // Achievements Status Grid Generator
    const achContainer = document.getElementById("achievements-container");
    achContainer.innerHTML = "";
    ACHIEVEMENTS_REGISTRY.forEach(ach => {
        const isUnlocked = state.userStats.unlockedAchievements.includes(ach.id);
        const achNode = document.createElement("div");
        achNode.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        achNode.innerHTML = `
            <div class="ach-icon">${ach.title.split(" ")[0]}</div>
            <div class="ach-info">
                <h4>${ach.title.substring(2)}</h4>
                <p>${ach.desc} ${isUnlocked ? '✅' : '🔒'}</p>
            </div>
        `;
        achContainer.appendChild(achNode);
    });
}

// ================= DAILY CHALLENGE CONFIG MODULES =================
function initDailyChallengeEngine() {
    function refreshCountdown() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = tomorrow - now;
        
        const hrs = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
        const mins = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
        const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
        
        document.getElementById("daily-countdown").innerText = `${hrs}:${mins}:${secs}`;
    }
    setInterval(refreshCountdown, 1000);
    refreshCountdown();

    const todayStr = new Date().toDateString();
    document.getElementById("daily-status-text").innerText = `Ready for challenge puzzle of ${todayStr}!`;
}

// ================= EVENT LISTENER HUBS =================
function setupCoreEventListeners() {
    // Top Hero Scroller
    document.getElementById("btn-start-exploring").addEventListener("click", () => {
        AudioEngine.play("click");
        document.getElementById("category-search").scrollIntoView({ behavior: 'smooth' });
        document.getElementById("category-search").focus();
    });

    // Search input framework
    document.getElementById("category-search").addEventListener("input", (e) => {
        const diff = document.getElementById("difficulty-select").value;
        renderCategoryGrid(e.target.value, diff);
    });

    // Difficulty filtering interaction selector
    document.getElementById("difficulty-select").addEventListener("change", (e) => {
        AudioEngine.play("click");
        const term = document.getElementById("category-search").value;
        renderCategoryGrid(term, e.target.value);
    });

    // Abandon In-game arena logic controller
    document.getElementById("btn-abort-quiz").addEventListener("click", () => {
        AudioEngine.play("click");
        clearInterval(state.activeQuiz.timerId);
        document.body.classList.remove("quiz-active");
        exitFullscreenMode();
        switchViewSection("home-screen");
    });

    // Daily play initialization routine
    document.getElementById("btn-play-daily").addEventListener("click", () => {
        AudioEngine.play("click");
        initQuizEngine("Random Challenge", "all", true);
    });

    // Report Card Navigation Action Controls Matrix
    document.getElementById("res-btn-retry").addEventListener("click", () => {
        AudioEngine.play("click");
        initQuizEngine(state.activeQuiz.category, state.activeQuiz.difficulty, state.activeQuiz.isDaily);
    });
    document.getElementById("res-btn-home").addEventListener("click", () => {
        AudioEngine.play("click");
        switchViewSection("home-screen");
    });
    document.getElementById("res-btn-random").addEventListener("click", () => {
        AudioEngine.play("click");
        const keys = Object.keys(QUIZ_BANKS);
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        initQuizEngine(randKey, "all");
    });
    document.getElementById("res-btn-next").addEventListener("click", () => {
        AudioEngine.play("click");
        const keys = Object.keys(QUIZ_BANKS);
        let currIdx = keys.indexOf(state.activeQuiz.category);
        let nextIdx = (currIdx + 1) % keys.length;
        initQuizEngine(keys[nextIdx], "all");
    });
}

// ================= FULLSCREEN QUIZ MODE =================
function enterFullscreenMode() {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (request) {
        try {
            const result = request.call(el);
            if (result && result.catch) result.catch(() => {}); // ignore rejection (e.g. permission/gesture issues)
        } catch (e) { /* fullscreen not available in this context; app still works windowed */ }
    }
}

function exitFullscreenMode() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!isFullscreen) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit) {
        try {
            const result = exit.call(document);
            if (result && result.catch) result.catch(() => {});
        } catch (e) { /* ignore */ }
    }
}

function switchViewSection(targetId) {
    document.querySelectorAll(".view-section").forEach(view => {
        if (view.id === targetId) {
            view.classList.remove("hidden");
            view.removeAttribute("aria-hidden");
        } else {
            view.classList.add("hidden");
            view.setAttribute("aria-hidden", "true");
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================= RUNTIME CORE INTERACTIVE QUIZ ENGINE =================
function initQuizEngine(categoryName, difficultyMode = "all", isDaily = false) {
    let sourcePool = [...QUIZ_BANKS[categoryName]];

    // Filter by difficulty if one is selected. Only fall back to the full
    // category pool if that difficulty has *zero* questions available —
    // previously this fell back whenever there were fewer than 12, which
    // silently ignored the user's difficulty choice while still labeling
    // the quiz with that difficulty.
    if (difficultyMode !== "all") {
        const filtered = sourcePool.filter(q => q.d === difficultyMode);
        if (filtered.length > 0) sourcePool = filtered;
    }

    // Fisher-Yates shuffle
    for (let i = sourcePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sourcePool[i], sourcePool[j]] = [sourcePool[j], sourcePool[i]];
    }

    // Use up to 12 questions (may be fewer if the difficulty filter has less available)
    state.activeQuiz = {
        category: categoryName,
        difficulty: difficultyMode,
        questions: sourcePool.slice(0, Math.min(12, sourcePool.length)),
        currentIdx: 0,
        score: 0,
        streak: 0,
        maxStreakThisRun: 0,
        startTime: Date.now(),
        timerVal: 15,
        timerId: null,
        isDaily: isDaily
    };

    document.getElementById("quiz-category-title").innerText = categoryName;
    document.getElementById("quiz-difficulty-title").innerText = difficultyMode === "all" ? "Mixed" : difficultyMode;

    document.body.classList.add("quiz-active");
    enterFullscreenMode();
    switchViewSection("quiz-screen");
    presentQuestionIndexScenario();
}

function presentQuestionIndexScenario() {
    const active = state.activeQuiz;
    clearInterval(active.timerId);

    if (active.currentIdx >= active.questions.length) {
        terminateQuizPipeline();
        return;
    }

    // Refresh Score Indicators
    document.getElementById("quiz-live-score").innerText = `Score: ${active.score * 100}`;
    document.getElementById("quiz-question-counter").innerText = `Question ${active.currentIdx + 1} of ${active.questions.length}`;
    
    // Progression Fill Vector update
    const percentWidth = ((active.currentIdx + 1) / active.questions.length) * 100;
    document.getElementById("quiz-progress-fill").style.width = `${percentWidth}%`;

    const dataObj = active.questions[active.currentIdx];
    document.getElementById("question-text-content").innerText = dataObj.q;

    // Shuffle and inject answer options configuration array mapping index maps
    const answersGrid = document.getElementById("quiz-answers-stack");
    answersGrid.innerHTML = "";

    // Array construction map tracking original index placements
    let selectionOptions = dataObj.a.map((ansText, originalIndex) => ({ text: ansText, id: originalIndex }));
    
    // Shuffle Selection options array placement order
    for (let i = selectionOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectionOptions[i], selectionOptions[j]] = [selectionOptions[j], selectionOptions[i]];
    }

    selectionOptions.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "answer-option-btn";
        btn.innerText = opt.text;
        btn.dataset.optId = opt.id; // original index, used later to reliably find the correct button

        btn.addEventListener("click", () => evaluateUserSelection(opt.id, btn));
        answersGrid.appendChild(btn);
    });

    // Reset countdown timer clock layout variables
    if (document.getElementById("toggle-timer").checked) {
        document.getElementById("quiz-timer-container").style.display = "block";
        active.timerVal = 15;
        executeTimerTickCycle();
        active.timerId = setInterval(executeTimerTickCycle, 1000);
    } else {
        document.getElementById("quiz-timer-container").style.display = "none";
    }
}

function executeTimerTickCycle() {
    const active = state.activeQuiz;
    document.getElementById("quiz-timer-text").innerText = active.timerVal;
    
    // Circular structural path perimeter dashboard update calculation
    const pathFillPercent = (active.timerVal / 15) * 100;
    document.getElementById("timer-progress-path").setAttribute("stroke-dasharray", `${pathFillPercent}, 100`);

    if (active.timerVal <= 0) {
        clearInterval(active.timerId);
        evaluateUserSelection(-1, null); // Timeout event registered as incorrect selection parameter triggers
    }
    active.timerVal--;
}

function evaluateUserSelection(selectedId, selectedButtonNode) {
    const active = state.activeQuiz;
    clearInterval(active.timerId);

    const correctId = active.questions[active.currentIdx].c;
    const buttons = document.querySelectorAll(".answer-option-btn");
    
    // Disable alternative input clicks during processing window actions
    buttons.forEach(b => b.style.pointerEvents = "none");

    if (selectedId === correctId) {
        AudioEngine.play("correct");
        if (selectedButtonNode) selectedButtonNode.classList.add("correct-pulse");
        active.score++;
        active.streak++;
        if (active.streak > active.maxStreakThisRun) active.maxStreakThisRun = active.streak;
    } else {
        AudioEngine.play("wrong");
        if (selectedButtonNode) selectedButtonNode.classList.add("incorrect-pulse");
        active.streak = 0;

        // Highlight the correct option by its original index, not by matching
        // rendered text — text-matching breaks if two answers are identical strings.
        buttons.forEach(b => {
            if (Number(b.dataset.optId) === correctId) {
                b.classList.add("correct-pulse");
            }
        });
    }

    // Brief presentation transition gap pause window before proceeding array indexing items
    setTimeout(() => {
        active.currentIdx++;
        presentQuestionIndexScenario();
    }, 1400);
}

// ================= REPORT SUMMARY COMPILATION MANAGEMENT =================
function terminateQuizPipeline() {
    const active = state.activeQuiz;
    const durationSecs = Math.round((Date.now() - active.startTime) / 1000);
    const accuracyVal = Math.round((active.score / active.questions.length) * 100);
    const avgTimePerQ = (durationSecs / active.questions.length).toFixed(1);

    AudioEngine.play("victory");

    // Podium Medal Scoring Evaluation logic checks
    let medal = "🥉 Bronze";
    let message = "Almost there! Try again and beat your score!";
    if (active.score === 12) {
        medal = "🥇 Gold";
        message = "Outstanding! You're a QuizzyBrain Master!";
        triggerConfettiCascadeAnimation();
    } else if (active.score >= 9) {
        medal = "🥈 Silver";
        message = "Great work! Keep practicing!";
    }

    // Display updates processing inputs
    document.getElementById("result-medal-podium").innerText = medal.split(" ")[0];
    document.getElementById("result-heading").innerText = medal.substring(2) + " Tier Awarded!";
    document.getElementById("result-feedback-text").innerText = message;
    document.getElementById("result-fraction-score").innerText = `${active.score} / ${active.questions.length}`;
    document.getElementById("result-percentage-score").innerText = `${accuracyVal}% Total Accuracy Rating`;
    
    document.getElementById("res-m-time").innerText = `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`;
    document.getElementById("res-m-avg").innerText = `${avgTimePerQ}s`;
    document.getElementById("res-m-streak").innerText = active.maxStreakThisRun;
    document.getElementById("res-m-cat").innerText = active.category;

    // Mutate and sync long term lifetime historical records metrics telemetry
    state.userStats.gamesPlayed++;
    state.userStats.totalAnswered += active.questions.length;
    state.userStats.totalCorrect += active.score;
    if (active.maxStreakThisRun > state.userStats.maxStreak) state.userStats.maxStreak = active.maxStreakThisRun;
    if (durationSecs < state.userStats.fastestTime) state.userStats.fastestTime = durationSecs;
    
    if (!state.userStats.completedCats.includes(active.category) && active.score >= 6) {
        state.userStats.completedCats.push(active.category);
    }

    // Tracks favorite category preferences
    state.userStats.catCounts[active.category] = (state.userStats.catCounts[active.category] || 0) + 1;
    let maxCount = 0, fav = "N/A";
    Object.keys(state.userStats.catCounts).forEach(c => {
        if (state.userStats.catCounts[c] > maxCount) { maxCount = state.userStats.catCounts[c]; fav = c; }
    });
    state.userStats.favCategory = fav;

    // Evaluate potential newly met achievements benchmarks targets criteria
    ACHIEVEMENTS_REGISTRY.forEach(ach => {
        if (!state.userStats.unlockedAchievements.includes(ach.id) && ach.condition(state.userStats)) {
            state.userStats.unlockedAchievements.push(ach.id);
        }
    });

    saveProgressToStorage();
    updateDashboardDisplays();
    document.body.classList.remove("quiz-active");
    exitFullscreenMode();
    switchViewSection("results-screen");
}

// ================= AUXILIARY DESIGN EFFECT ENGINE FUNCTIONS =================
function triggerConfettiCascadeAnimation() {
    const box = document.querySelector(".confetti-holder-box");
    box.innerHTML = "";
    for (let i = 0; i < 100; i++) {
        const conf = document.createElement("div");
        conf.style.position = "absolute";
        conf.style.width = "8px";
        conf.style.height = "8px";
        conf.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        conf.style.left = `${Math.random() * 100}%`;
        conf.style.top = `${Math.random() * 40}%`;
        conf.style.borderRadius = "50%";
        conf.style.opacity = Math.random();
        conf.style.transform = `rotate(${Math.random() * 360}deg)`;
        box.appendChild(conf);
        
        // Native programmatic drift configuration parameters fall animation paths
        let currentTop = parseFloat(conf.style.top);
        function fall() {
            currentTop += 0.8;
            conf.style.top = `${currentTop}%`;
            if (currentTop < 100) requestAnimationFrame(fall);
            else conf.remove();
        }
        requestAnimationFrame(fall);
    }
}
