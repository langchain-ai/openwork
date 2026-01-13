# Homebrew Cask formula for openwork
# This file should be published to a tap repository (e.g., langchain-ai/homebrew-tap)

cask "openwork" do
  version "0.1.0"
  sha256 :no_check  # Update with actual SHA256 after first release

  url "https://github.com/langchain-ai/openwork/releases/download/v#{version}/openwork-#{version}-mac.dmg"
  name "openwork"
  desc "Tactical agent interface for deepagentsjs"
  homepage "https://github.com/langchain-ai/openwork"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "openwork.app"

  zap trash: [
    "~/Library/Application Support/openwork",
    "~/Library/Preferences/com.langchain.openwork.plist",
    "~/Library/Logs/openwork",
  ]
end
