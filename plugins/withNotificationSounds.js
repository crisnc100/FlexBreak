const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withNotificationSounds(config) {
  return withXcodeProject(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const project = config.modResults;
    
    // Sound file to include
    const soundFileName = 'AInotification1.mp3';
    const soundSourcePath = path.join(projectRoot, 'assets', 'sounds', soundFileName);
    
    // Check if sound file exists
    if (!fs.existsSync(soundSourcePath)) {
      console.warn(`Sound file not found at ${soundSourcePath}`);
      return config;
    }
    
    // Get the main group
    const mainGroup = project.getFirstProject().firstProject.mainGroup;
    
    // Create or get Resources group
    let resourcesGroup = project.pbxGroupByName('Resources');
    if (!resourcesGroup) {
      resourcesGroup = project.addPbxGroup([], 'Resources', mainGroup);
    }
    
    // Add the sound file to the project
    const file = project.addResourceFile(
      soundSourcePath,
      { target: project.getFirstTarget().uuid },
      resourcesGroup.uuid
    );
    
    if (!file) {
      console.warn(`Failed to add ${soundFileName} to Xcode project`);
    } else {
      console.log(`Successfully added ${soundFileName} to Xcode project`);
    }
    
    return config;
  });
};