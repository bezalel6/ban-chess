# Download all chess sound files from script.js

$sounds = @(
    @{name='tenseconds.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/tenseconds.mp3'},
    @{name='puzzle-correct-2.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-correct-2.mp3'},
    @{name='illegal.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/illegal.mp3'},
    @{name='shoutout.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/shoutout.mp3'},
    @{name='premove.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/premove.mp3'},
    @{name='puzzle-correct.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-correct.mp3'},
    @{name='move-self-check.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self-check.mp3'},
    @{name='move-check.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3'},
    @{name='incorrect.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/incorrect.mp3'},
    @{name='notification.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notification.mp3'},
    @{name='lesson-fail.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/lesson-fail.mp3'},
    @{name='event-warning.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-warning.mp3'},
    @{name='move-self.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3'},
    @{name='correct.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/correct.mp3'},
    @{name='game-end.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3'},
    @{name='move-opponent.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent.mp3'},
    @{name='notify.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3'},
    @{name='event-end.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-end.mp3'},
    @{name='game-start.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3'},
    @{name='event-start.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/event-start.mp3'},
    @{name='lesson_pass.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/lesson_pass.mp3'},
    @{name='promote.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3'},
    @{name='achievement.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/achievement.mp3'},
    @{name='game-lose-long.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-lose-long.mp3'},
    @{name='decline.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/decline.mp3'},
    @{name='draw-offer.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/draw-offer.mp3'},
    @{name='game-win-long.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-win-long.mp3'},
    @{name='puzzle-wrong.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-wrong.mp3'},
    @{name='game-draw.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-draw.mp3'},
    @{name='scatter.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/scatter.mp3'},
    @{name='game-lose.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-lose.mp3'},
    @{name='capture.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3'},
    @{name='castle.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3'},
    @{name='move-opponent-check.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-opponent-check.mp3'},
    @{name='click.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/click.mp3'},
    @{name='boom.mp3'; url='https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/boom.mp3'}
)

$outputDir = "C:\Users\bezal\CODE\2ban-2chess\public\sounds\default"

# Ensure output directory exists
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "Starting download of $($sounds.Count) sound files..."
Write-Host "Destination: $outputDir"
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($sound in $sounds) {
    $outputPath = Join-Path $outputDir $sound.name
    Write-Host "Downloading: $($sound.name)... " -NoNewline
    
    try {
        Invoke-WebRequest -Uri $sound.url -OutFile $outputPath -ErrorAction Stop
        Write-Host "SUCCESS" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "Download complete!"
Write-Host "Success: $successCount files" -ForegroundColor Green
Write-Host "Failed: $failCount files" -ForegroundColor Red

# List downloaded files
Write-Host ""
Write-Host "Downloaded files:"
Get-ChildItem $outputDir -Filter "*.mp3" | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB, 2)
    $output = "  - " + $_.Name + " [" + $sizeKB + " KB]"
    Write-Host $output
}