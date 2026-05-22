/**
 * MagicCars Support MVP — Vehicle Knowledge Base
 *
 * Product: Magic Cars 12V 2WD Ride-On Jeep with Manual and Remote Control
 * URL: https://www.magiccars.com/products/12v-2wd-ride-on-jeep-car-with-manual-and-remote-control-options
 */

import { RecommendedRoute } from './db'

export interface KnowledgeEntry {
  system_id: string
  system_name: string
  component: string
  issue_keywords: string[]
  issue_description: string
  photo_required: boolean
  video_required: boolean
  media_instructions: string[]
  possible_causes: string[]
  safe_owner_steps: string[]
  do_not_do: string[]
  escalation_trigger: string
  escalation_required: boolean
  recommended_route: RecommendedRoute
  agent_script_opener: string
}

export interface Vehicle {
  vehicle_id: string
  year: string
  make: string
  model: string
  display_name: string
  product_url: string
  specifications: Record<string, string>
  system_components: string[]
  troubleshooting_order: string[]
  systems: KnowledgeEntry[]
}

// ─── Product Specifications ───────────────────────────────────────────────────

const JEEP_SPECS: Record<string, string> = {
  Battery: '12V 7Ah Rechargeable',
  Charger: '12V 1000mA',
  Motors: 'Dual 12V Drive Motors',
  'Drive Type': '2WD',
  'Speed Range': '1.86 to 3.73 MPH',
  Runtime: '1 to 2 Hours',
  'Charge Time': '8 to 12 Hours',
  Remote: '2.4G Parent Remote Control',
  Suspension: '4 Wheel Spring Suspension',
  'Weight Capacity': '66 lbs (30kg)',
  'Age Range': '3 to 6 Years',
  'Drive Modes': 'Manual foot pedal + 2.4G parent remote',
}

// ─── Main Knowledge Base ──────────────────────────────────────────────────────

export const DEMO_VEHICLE: Vehicle = {
  vehicle_id: 'magiccars-12v-2wd-jeep',
  year: '2024',
  make: 'Magic Cars',
  model: '12V 2WD Ride-On Jeep',
  display_name: 'Magic Cars 12V 2WD Ride-On Jeep',
  product_url:
    'https://www.magiccars.com/products/12v-2wd-ride-on-jeep-car-with-manual-and-remote-control-options',
  specifications: JEEP_SPECS,
  system_components: [
    '12V 7Ah Battery',
    'Charger (12V 1000mA)',
    'Inline Fuse',
    'Main Control Board / Motherboard',
    '2.4G Remote Receiver Module',
    'Foot Pedal Switch',
    'Gear Selector Switch',
    'Steering Motor',
    'Dual Drive Motors (x2)',
    'Gearboxes (x2)',
    'LED Light System',
    'MP3 / USB / FM Audio Board',
    'Wiring Harness',
    'Charging Port',
  ],
  troubleshooting_order: [
    '1. Battery — check charge and voltage',
    '2. Fuse — check inline fuse near battery',
    '3. Charger — verify output voltage',
    '4. Wiring connections — reseat all connectors',
    '5. Remote pairing — re-pair remote',
    '6. Pedal switch — test continuity',
    '7. Control board — inspect for burn marks',
    '8. Motors and gearboxes — test directly',
  ],
  systems: [

    // ── 1. NO POWER ─────────────────────────────────────────────────────────
    {
      system_id: 'no_power',
      system_name: 'Vehicle Will Not Power On',
      component: 'Battery, Fuse, Power Switch, Control Board',
      issue_keywords: [
        "won't turn on", 'dead', 'no power', 'nothing works', "won't start",
        'no lights', 'no sounds', 'completely dead', 'not turning on',
        'black screen', 'no response',
      ],
      issue_description: 'Vehicle shows no signs of life — no lights, no sounds, no movement',
      photo_required: true,
      video_required: false,
      media_instructions: [
        'Photo of the battery compartment and battery connector',
        'Photo of the dashboard or power switch area',
        'Photo of the charging port',
        'Photo of the inline fuse if accessible',
      ],
      possible_causes: [
        'Dead battery — most common cause',
        'Blown inline fuse',
        'Loose or disconnected battery connector',
        'Faulty main power switch',
        'Failed control board',
        'Charger that never actually charged the battery',
      ],
      safe_owner_steps: [
        'Charge the battery for a full 8 to 12 hours using the included charger.',
        'After charging, check that the charger indicator light was on during charging.',
        'Reconnect the battery connector firmly — unplug it fully and plug it back in.',
        'Check the inline fuse near the battery — if the wire inside is broken, the fuse is blown.',
        'Replace a blown fuse with the same amp rating only.',
        'Try the power switch again after fully charging.',
      ],
      do_not_do: [
        'Do not attempt to jump-start the battery from a car battery.',
        'Do not connect the battery in reverse polarity.',
        'Do not use a fuse with a higher amp rating than the original.',
        'Do not attempt to open or repair the control board yourself.',
      ],
      escalation_trigger: 'Battery is fully charged and fuse is good but vehicle still shows no power',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "I can help with that. Let's start with the most common cause — the battery. Can you tell me how long you charged it for, and did the charger light come on during charging?",
    },

    // ── 2. LIGHTS WORK BUT NO MOVEMENT ──────────────────────────────────────
    {
      system_id: 'no_movement',
      system_name: 'Lights Work But Vehicle Will Not Move',
      component: 'Pedal Switch, Control Board, Drive Motors, Gearboxes',
      issue_keywords: [
        "lights on but won't move", "won't drive", 'pedal not working',
        "music works but won't go", 'turns on but no movement', "wheels won't spin",
        'pressing pedal nothing happens', 'stuck', 'not moving',
      ],
      issue_description:
        'Vehicle powers on — lights and music work — but pressing the pedal produces no movement',
      photo_required: true,
      video_required: true,
      media_instructions: [
        'Video showing the vehicle powered on',
        'Video showing someone pressing the foot pedal while filming the wheels',
        'Video with sound enabled — listen for any clicking from the board',
        'Photo of the underside showing the motor and gearbox connections if accessible',
      ],
      possible_causes: [
        'Failed foot pedal switch — most common cause',
        'Gear selector not engaged (neutral position)',
        'Loose motor wiring connector',
        'Failed control board drive relay',
        'Burned or seized drive motor',
        'Stripped gearbox',
        'Weak battery that powers lights but not motors',
      ],
      safe_owner_steps: [
        'Make sure the gear selector is in forward (F) or reverse (R) — not in neutral.',
        'Listen closely when pressing the pedal — a click from the board means the board is receiving the signal.',
        'Check the battery voltage or charge fully if the battery is more than 6 months old.',
        'Inspect the motor wire connectors under the vehicle for any that have come loose.',
        'Try the parent remote to drive the vehicle — if remote works but pedal does not, the pedal switch is the issue.',
      ],
      do_not_do: [
        'Do not force the wheels to spin by hand while the vehicle is powered on.',
        'Do not bypass the pedal switch with a direct wire unless you are a qualified technician.',
        'Do not apply more than 12V directly to the motor for testing without proper equipment.',
      ],
      escalation_trigger:
        'Gear selector is engaged, battery is good, and board clicks when pedal is pressed but wheels still do not move',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "Okay, so the lights and music are working — that tells me the battery and board have power. The next thing to check is whether the issue is with the foot pedal switch or the motors. Can I ask — when you press the pedal, do you hear any clicking sound from inside the vehicle?",
    },

    // ── 3. REMOTE CONTROL NOT WORKING ────────────────────────────────────────
    {
      system_id: 'remote_failure',
      system_name: 'Remote Control Not Working',
      component: '2.4G Remote, Receiver Module',
      issue_keywords: [
        'remote not working', "remote won't pair", "remote won't connect",
        'parent remote', '2.4g remote', 'remote control', 'remote not pairing',
        "can't control remotely", 'remote light not on', 'remote dead',
      ],
      issue_description: 'Parent remote control does not steer or drive the vehicle',
      photo_required: false,
      video_required: true,
      media_instructions: [
        'Video showing the vehicle powered on',
        'Video showing the remote attempting to connect — watch for LED indicators',
        'Video showing whether manual pedal driving still works',
        'Close-up photo of the remote with batteries installed',
      ],
      possible_causes: [
        'Remote not paired to the vehicle',
        'Dead or weak AAA batteries in the remote',
        'Remote out of 2.4G range — usually 10 to 30 meters',
        'Signal interference from other 2.4G devices nearby',
        'Failed receiver module in the vehicle',
        'Antenna wire disconnected inside vehicle',
      ],
      safe_owner_steps: [
        'Install fresh AAA batteries in the remote — old batteries are the most common cause.',
        'Perform the pairing procedure: Turn vehicle OFF. Install fresh remote batteries. Hold the pairing button on the remote. Turn vehicle ON. Wait for a solid LED on the remote.',
        'Move away from WiFi routers, baby monitors, and other 2.4G devices.',
        'Test manual foot pedal driving — if that works, the vehicle electronics are fine and the issue is with the remote or receiver.',
        'Stay within 15 feet of the vehicle when pairing.',
      ],
      do_not_do: [
        'Do not attempt to open or repair the receiver module yourself.',
        'Do not pair the remote near other ride-on vehicles using 2.4G remotes.',
        'Do not use rechargeable AAA batteries in the remote — they produce lower voltage and cause pairing issues.',
      ],
      escalation_trigger:
        'Fresh batteries installed, pairing procedure completed, and remote still will not connect',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "Remote issues are usually a quick fix. First — are there fresh batteries in the remote? Rechargeable batteries often cause pairing problems because they run at lower voltage. Let's try the pairing procedure with brand new AAA batteries.",
    },

    // ── 4. STEERING FAILURE ───────────────────────────────────────────────────
    {
      system_id: 'steering_failure',
      system_name: 'Steering Not Working',
      component: 'Steering Motor, Steering Linkage, Control Board Relay',
      issue_keywords: [
        "won't steer", 'steering not working', "can't turn", 'only goes straight',
        'steering motor', "won't turn left", "won't turn right", 'steering rod',
        'steering loose', 'steering clicks',
      ],
      issue_description:
        'Vehicle drives but does not respond to steering input from remote or wheel',
      photo_required: true,
      video_required: true,
      media_instructions: [
        'Video showing the front wheels from above while attempting to steer with the remote',
        'Video showing the steering wheel being turned if applicable',
        'Photo of the front steering linkage and tie rods if accessible',
        'Video with sound enabled to capture any clicking or grinding from the steering motor',
      ],
      possible_causes: [
        'Failed or burned steering motor',
        'Steering linkage disconnected or broken tie rod',
        'Stripped steering motor gears',
        'Bad steering relay on the control board',
        'Steering motor wire connector loose',
      ],
      safe_owner_steps: [
        'Check that the front wheels can physically move left and right by hand — if they are seized, there may be a linkage issue.',
        'Inspect the steering rod and tie rod connections at the front wheels for any that have popped off.',
        'Try steering only with the remote — if remote steers but the physical wheel does not, the issue is mechanical.',
        'Listen for any clicking or humming from the front of the vehicle when attempting to steer.',
      ],
      do_not_do: [
        'Do not force the steering wheel hard left or right if you feel resistance — this can strip the steering motor gears.',
        'Do not allow the vehicle to be driven if the front wheels are stuck in a turned position.',
        'Do not attempt to repair the steering motor internals yourself.',
      ],
      escalation_trigger:
        'Steering linkage appears intact but steering motor produces no movement or sound',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "Steering issues are usually either the steering motor itself or a linkage that has come loose. Can you do a quick check — can you move the front wheels left and right by hand when the vehicle is off? That will help me figure out if it is mechanical or electrical.",
    },

    // ── 5. BATTERY / CHARGING ISSUES ─────────────────────────────────────────
    {
      system_id: 'battery_issues',
      system_name: 'Battery or Charging Problems',
      component: '12V 7Ah Battery, 12V 1000mA Charger, Charging Port',
      issue_keywords: [
        "won't charge", 'battery dead', 'charger not working', 'charger light',
        "won't hold charge", 'charging port', 'battery', 'how long to charge',
        'charger warm', 'charger hot', 'green light', 'red light',
      ],
      issue_description: 'Battery will not charge or charger shows no activity',
      photo_required: true,
      video_required: false,
      media_instructions: [
        'Photo of the charger LED indicator while plugged into both the vehicle and the wall',
        'Photo of the charging port on the vehicle — look for bent pins or burn marks',
        'Photo of the battery label showing voltage and amp-hour rating',
        'Photo of the charger plug tip',
      ],
      possible_causes: [
        'Charger LED indicator showing wrong status',
        'Damaged charging port — bent or corroded pins',
        'Failed charger — most common after 1 to 2 years',
        'Deeply discharged battery below recovery threshold',
        'Sulfated battery from long-term storage without charging',
        'Broken charging port wire inside vehicle',
      ],
      safe_owner_steps: [
        'Plug the charger into the wall first, then into the vehicle — in that order.',
        'The charger indicator light should turn red or orange during charging and green when complete.',
        'Charge for a full 8 to 12 hours on the first charge.',
        'Inspect the charging port tip for any bent pins or debris.',
        'After a full charge, test the vehicle immediately — if it dies in under 10 minutes, the battery needs replacement.',
        'Recharge the battery monthly during storage to prevent sulfation.',
      ],
      do_not_do: [
        'Do not charge for more than 12 hours — overcharging damages the battery.',
        'Do not store the vehicle with a dead battery for more than 30 days.',
        'Do not use a charger from a different ride-on vehicle — voltage and polarity must match.',
        'Do not attempt to open or recondition the battery.',
      ],
      escalation_trigger:
        'Charger is plugged in correctly and shows charging status but battery dies within 10 minutes of use',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        'Battery and charger issues are very common — and usually an easy fix. Can you tell me what the charger light is doing right now? Is it red, green, or showing no light at all?',
    },

    // ── 6. SHORT RUNTIME ──────────────────────────────────────────────────────
    {
      system_id: 'short_runtime',
      system_name: 'Vehicle Dies Too Quickly',
      component: '12V 7Ah Battery, Drive Motors',
      issue_keywords: [
        'dies fast', 'stops after a few minutes', 'short battery life',
        'only runs for 5 minutes', 'battery dies quickly', 'runs out fast',
        'short runtime', "won't last", 'only lasts a few minutes',
      ],
      issue_description: 'Vehicle runs for only 5 to 15 minutes before stopping',
      photo_required: false,
      video_required: true,
      media_instructions: [
        'Video showing the vehicle driving on a flat surface indoors',
        'Video showing the shutdown behavior — does it stop suddenly or slow down first?',
        'Photo of the battery label — age and model number',
      ],
      possible_causes: [
        'Aging battery past its service life — average 1 to 3 years',
        'Rider weight exceeding 66 lb capacity',
        'Driving on grass, gravel, or steep inclines — significantly drains battery',
        'Motor drag from worn gearboxes or debris in wheels',
        'Thermal protection trip from overloaded motors',
      ],
      safe_owner_steps: [
        'Charge the battery fully for 8 to 12 hours before testing.',
        'Test the vehicle on a smooth flat floor indoors without a rider first.',
        'Keep the vehicle on hard flat surfaces — grass and hills can cut runtime by 50% or more.',
        'Confirm the rider is within the 66 lb weight limit.',
        'If runtime is under 15 minutes after a full charge, the battery needs replacement.',
        'After a sudden stop, allow 20 to 30 seconds before trying again — thermal protection may have tripped.',
      ],
      do_not_do: [
        'Do not continue using the vehicle with a battery that dies in under 10 minutes.',
        'Do not let the battery fully discharge repeatedly — this permanently damages it.',
        'Do not use the vehicle on grass, sand, mud, or hills as primary driving surfaces.',
      ],
      escalation_trigger:
        'Battery is less than 1 year old and runtime is under 15 minutes after a full 10-hour charge',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        'Short runtime is almost always the battery. How old is the battery, and is your child driving on grass or mostly hard surfaces? Those two things have the biggest impact on how long it lasts.',
    },

    // ── 7. GRINDING OR CLICKING NOISE ────────────────────────────────────────
    {
      system_id: 'grinding_noise',
      system_name: 'Grinding or Clicking Sound',
      component: 'Gearbox, Drive Motor, Battery, Control Board Relay',
      issue_keywords: [
        'grinding', 'clicking', 'crunching', 'clunking', 'rattling', 'clicking noise',
        'grinding noise', 'loud noise', 'makes noise', 'sounds wrong', 'buzzing',
        'humming', 'wheels grinding',
      ],
      issue_description: 'Vehicle makes an unusual grinding, clicking, or crunching sound during operation',
      photo_required: false,
      video_required: true,
      media_instructions: [
        'Video with sound enabled — capture the noise while the vehicle is attempting to drive',
        'Video showing the wheels while the noise is occurring',
        'Video from behind the vehicle if the noise is from the rear wheels',
        'Video of the front steering area if the grinding is during turning',
      ],
      possible_causes: [
        'Stripped gearbox — most common cause of grinding',
        'Debris caught in the wheel or gearbox housing',
        'Clicking from control board relay (normal when board receives pedal signal)',
        'Worn motor brushes causing intermittent contact',
        'Loose gearbox mounting allowing vibration',
        'Weak battery causing motor to strain and click',
      ],
      safe_owner_steps: [
        'Stop driving the vehicle immediately if grinding is severe.',
        'Inspect the wheels and axles for debris — sticks, hair, or plastic that has wrapped around.',
        'Listen for whether the grinding is constant or only when driving — constant grinding suggests gearbox.',
        'Check whether both wheels spin or only one — a seized gearbox often stops one wheel.',
        'A single click when pressing the pedal is normal board behavior — this is not a fault.',
      ],
      do_not_do: [
        'Do not continue driving with a severe grinding noise — this will worsen gearbox damage rapidly.',
        'Do not attempt to lubricate the gearbox with oil — the gears are plastic and oil will cause slipping.',
        'Do not open the gearbox housing to inspect internally — replace as a unit.',
      ],
      escalation_trigger:
        'Grinding is persistent, one wheel stops spinning, or grinding worsens after debris check',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        'A grinding noise almost always points to the gearbox. I want to send you a video with the sound on so I can hear exactly what it sounds like. Can you film it while pressing the pedal with the sound on?',
    },

    // ── 8. ONE WHEEL NOT SPINNING ─────────────────────────────────────────────
    {
      system_id: 'one_wheel',
      system_name: 'One Wheel Not Spinning',
      component: 'Gearbox, Drive Motor, Motor Connector, Axle',
      issue_keywords: [
        'one wheel', 'only one side', 'left wheel not spinning', 'right wheel not spinning',
        'one motor', 'one side working', 'spinning on one side',
        'just one wheel', 'wheel not turning',
      ],
      issue_description: 'One rear wheel spins while the other does not',
      photo_required: false,
      video_required: true,
      media_instructions: [
        'Video showing both rear wheels from behind while someone presses the pedal',
        'Video showing which wheel is stationary and which is spinning',
        'Video with sound to capture any difference in motor noise between sides',
      ],
      possible_causes: [
        'Stripped or seized gearbox on the non-spinning side',
        'Motor connector unplugged on one side',
        'Failed drive motor on one side',
        'Axle disconnected from gearbox',
        'Note: at low speed, slight spinning difference between wheels can be normal on 2WD vehicles',
      ],
      safe_owner_steps: [
        'Confirm which wheel is fully stationary versus which is spinning — lift the rear if safe to do so.',
        'Check for any debris wrapped around the stationary wheel axle.',
        'Listen for whether the stationary side motor makes any sound when driving — sound means motor is alive, silence may mean disconnected motor wire.',
        'If one wheel spins freely by hand and the other is stiff, the stiff side gearbox may be seized.',
      ],
      do_not_do: [
        'Do not attempt to swap motors between sides without first diagnosing the root cause.',
        'Do not drive the vehicle with one wheel not spinning on uneven surfaces — it will pull sharply.',
        'Do not attempt to open or repair the gearbox internally.',
      ],
      escalation_trigger:
        'One wheel is completely stationary with no motor sound and no debris present',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "One wheel not spinning is usually a gearbox or a motor connector. Before we dig in — when you lift the rear of the vehicle, can you spin both wheels by hand? I want to know if one feels stiff or seized.",
    },

    // ── 9. VEHICLE WILL NOT REVERSE ───────────────────────────────────────────
    {
      system_id: 'no_reverse',
      system_name: 'Vehicle Will Not Go in Reverse',
      component: 'Gear Selector Switch, Control Board Reverse Relay',
      issue_keywords: [
        'no reverse', "won't go backwards", 'reverse not working', 'reverse gear',
        'shifter', 'gear selector', "can't reverse", 'only forward',
      ],
      issue_description:
        'Vehicle drives forward but will not go in reverse when gear selector is switched',
      photo_required: true,
      video_required: true,
      media_instructions: [
        'Video showing the gear selector being moved to Reverse (R)',
        'Video showing the vehicle attempting to move in reverse — watch wheels',
        'Photo of the gear selector switch and its wiring',
      ],
      possible_causes: [
        'Gear selector switch not fully engaging in the Reverse position',
        'Loose wiring at the gear selector',
        'Faulty gear selector microswitch',
        'Failed reverse relay on the control board',
      ],
      safe_owner_steps: [
        'Push the gear selector firmly into the Reverse (R) position — it should click.',
        'Try pressing the pedal immediately after moving to Reverse.',
        'Check the wiring at the base of the gear selector for any loose connectors.',
        'Test whether the remote drives the vehicle in reverse — if it does, the pedal/selector circuit is the issue.',
      ],
      do_not_do: [
        'Do not force the gear selector if it feels stuck.',
        'Do not attempt to drive in reverse on steep inclines.',
      ],
      escalation_trigger:
        'Gear selector is firmly in Reverse, wiring is intact, but vehicle still will not reverse with remote or pedal',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "Reverse issues are usually the gear selector switch or its wiring. Can you push the selector firmly into the R position — does it click? And when you press the pedal, do you hear anything from the vehicle at all?",
    },

    // ── 10. VEHICLE DRIVES VERY SLOWLY ───────────────────────────────────────
    {
      system_id: 'speed_slow',
      system_name: 'Vehicle Drives Very Slowly',
      component: 'Battery, Drive Motors, Gearbox',
      issue_keywords: [
        'too slow', 'drives slow', 'very slow', 'sluggish', 'barely moving',
        'slow speed', "won't go fast", 'not fast enough', 'weak',
      ],
      issue_description: 'Vehicle moves but at noticeably reduced speed',
      photo_required: false,
      video_required: true,
      media_instructions: [
        'Video showing the vehicle driving on a flat hard floor at full speed',
        'Video without the rider for comparison if possible',
      ],
      possible_causes: [
        'Weak or partially charged battery',
        'Rider over the 66 lb weight limit',
        'Driving on grass, carpet, or sand — high resistance surfaces',
        'Aging drive motors with worn brushes',
        'Gearbox beginning to fail — increased internal friction',
      ],
      safe_owner_steps: [
        'Charge the battery fully for 10 to 12 hours.',
        'Test the vehicle without a rider on a flat hard floor — if it is fast without the rider, the weight or surface is the issue.',
        'Confirm the rider is within the 66 lb limit.',
        'Move the vehicle to hard flooring — grass and carpet reduce speed significantly.',
      ],
      do_not_do: [
        'Do not attempt to modify the speed controller to increase speed beyond factory limits.',
        'Do not operate the vehicle on grass or thick carpet with a rider near the weight limit.',
      ],
      escalation_trigger:
        'Vehicle is slow even without a rider on hard flooring with a fully charged battery',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "Slow speed can be a battery issue or a surface issue. Can you try the vehicle on a hard floor without your child in it, right after a full charge? That will tell us if it is the battery or the motors.",
    },

    // ── 11. LIGHTS OR MUSIC NOT WORKING ──────────────────────────────────────
    {
      system_id: 'lights_audio',
      system_name: 'LED Lights or Music Not Working',
      component: 'LED Light Harness, MP3/USB Audio Board',
      issue_keywords: [
        'no lights', 'lights not working', 'no music', 'music not working',
        'no sound', 'USB not working', 'MP3', 'radio', 'lights flickering',
        'headlights', 'audio', 'sound system',
      ],
      issue_description:
        'LED lights or music system not functioning while vehicle otherwise operates',
      photo_required: true,
      video_required: false,
      media_instructions: [
        'Photo of the dashboard showing the power switch and any indicator lights',
        'Photo of the headlight area and LED connectors if accessible',
        'Photo of the USB/MP3 input port',
      ],
      possible_causes: [
        'Loose LED light harness connector',
        'Blown audio board',
        'USB file format not supported — most boards require MP3 format, FAT32 filesystem',
        'Loose audio board connector',
        'LED strip connection come loose from vibration',
      ],
      safe_owner_steps: [
        'Toggle the vehicle off and on — some audio boards require a power cycle to reset.',
        'Check whether both issues (lights AND audio) are present or just one — they use separate boards.',
        'For USB audio: format the USB drive as FAT32, use MP3 files only, file names should have no special characters.',
        'Inspect the headlight connector at the front of the vehicle for any that have come loose.',
        'FM radio mode may work even if USB does not — test both.',
      ],
      do_not_do: [
        'Do not use FLAC, WAV, or AAC audio files — most boards only support MP3.',
        'Do not attempt to solder or repair the audio board.',
      ],
      escalation_trigger:
        'LED lights are completely off and reconnecting the harness does not restore them',
      escalation_required: false,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "Let's sort out the lights and audio separately. Is it both the lights and the music that aren't working, or just one of them? That tells me whether it is a wiring issue or just the audio board.",
    },

    // ── 12. WATER DAMAGE ──────────────────────────────────────────────────────
    {
      system_id: 'water_damage',
      system_name: 'Water or Weather Damage',
      component: 'Control Board, Pedal Switch, Connectors, Motors',
      issue_keywords: [
        'water damage', 'rain', 'wet', 'puddle', 'outdoor', 'stored outside',
        'rained on', 'got wet', 'moisture', 'condensation', 'rust', 'corrosion',
      ],
      issue_description:
        'Vehicle behaved strangely or stopped working after exposure to rain, puddles, or outdoor storage',
      photo_required: true,
      video_required: false,
      media_instructions: [
        'Photos of the battery compartment — look for rust, corrosion, or condensation',
        'Photos of any visible wiring and connectors — look for corrosion or moisture',
        'Photo of the underside of the vehicle',
        'Photo of the control board if accessible',
      ],
      possible_causes: [
        'Water intrusion into the main control board — causes short circuits',
        'Corroded wiring connectors — causes intermittent failures',
        'Corroded battery terminals',
        'Failed pedal switch from moisture intrusion',
        'Motor corrosion from repeated wet operation',
      ],
      safe_owner_steps: [
        'Disconnect the battery immediately and do not attempt to charge or operate the vehicle.',
        'Move the vehicle indoors and allow to dry completely — minimum 24 to 48 hours.',
        'Inspect all connectors for green or white corrosion — use a dry cloth to clean.',
        'Inspect the battery terminals for corrosion.',
        'After drying completely, reconnect and test — do not test while any moisture is visible.',
      ],
      do_not_do: [
        'Do not charge or operate the vehicle while it is wet or damp.',
        'Do not use a hair dryer or heat gun on electronics — heat damages components.',
        'Do not store the vehicle outdoors without a weatherproof cover.',
        'Do not drive through puddles or hose down the vehicle.',
      ],
      escalation_trigger:
        'Vehicle was exposed to significant water and shows intermittent behavior, shorts, or complete failure after drying',
      escalation_required: true,
      recommended_route: 'human_support',
      agent_script_opener:
        "The most important thing right now is to disconnect the battery and not charge or operate it until everything has completely dried out. Can you unplug the battery connector inside the vehicle right now while we talk?",
    },

    // ── 13. PHYSICAL DAMAGE ───────────────────────────────────────────────────
    {
      system_id: 'physical_damage',
      system_name: 'Broken or Physically Damaged Parts',
      component: 'Body Panels, Axles, Wheels, Steering Linkage',
      issue_keywords: [
        'broken', 'cracked', 'snapped', 'bent', 'fell off', 'broke off',
        'damaged', 'plastic broken', 'wheel fell off', 'axle bent',
        'body cracked', 'bumper', 'door', 'hood',
      ],
      issue_description: 'Physical parts of the vehicle are broken, cracked, or have detached',
      photo_required: true,
      video_required: false,
      media_instructions: [
        'Close-up photo of the damaged area',
        'Photo of the full vehicle for context',
        'Photo of any broken pieces that came off',
        'Photo of the underside if wheels or axles are involved',
      ],
      possible_causes: [
        'Impact from collision or drop',
        'UV degradation of plastic from outdoor sun exposure',
        'Overloading beyond 66 lb weight capacity',
        'Driving off curbs, steps, or elevated surfaces',
        'Normal wear over extended use',
      ],
      safe_owner_steps: [
        'Check that no sharp plastic edges are accessible to the child.',
        'If a wheel has detached, do not operate the vehicle until it is reattached properly.',
        'Document the damage with clear photos before contacting support.',
        'Check the order date — warranty typically covers manufacturing defects, not impact damage.',
      ],
      do_not_do: [
        'Do not allow a child to ride a vehicle with a detached wheel or severely cracked body panel.',
        'Do not attempt to glue structural plastic components — they will fail under load.',
        'Do not operate with exposed wiring from damaged body panels.',
      ],
      escalation_trigger:
        'Structural damage affects safe operation — wheel detached, axle bent, or wiring exposed',
      escalation_required: true,
      recommended_route: 'replacement_part',
      agent_script_opener:
        "I want to make sure your child can use this safely. Can you send me a couple of clear photos of the damage? That will help me figure out whether this is a part we can send you or whether the vehicle needs to come off the road until it's fixed.",
    },

    // ── 14. BURNING SMELL — SAFETY ESCALATION ─────────────────────────────────
    {
      system_id: 'burning_smell',
      system_name: 'Burning Smell',
      component: 'Drive Motor, Battery, Control Board, Wiring',
      issue_keywords: [
        'burning smell', 'smells like burning', 'burning', 'smoke', 'melting',
        'melting plastic', 'hot smell', 'electrical smell', 'sparks',
      ],
      issue_description: 'A burning, electrical, or melting smell is coming from the vehicle',
      photo_required: true,
      video_required: false,
      media_instructions: [
        'Photo of the motor area and wiring harness',
        'Photo of the battery connector and battery',
        'Photo of any visible burn marks on the body or underside',
        'Photo of the control board if accessible',
      ],
      possible_causes: [
        'Drive motor overheating from overload, grass driving, or overweight rider',
        'Burned or melted wiring connector',
        'Control board short circuit',
        'Battery overheating from charger mismatch or damage',
        'Gearbox seizing and causing motor to overheat',
      ],
      safe_owner_steps: [
        'Stop using the vehicle immediately.',
        'Remove your child from the vehicle.',
        'Turn the vehicle off and disconnect the battery connector.',
        'Do not charge the vehicle until it has been inspected.',
        'Allow the vehicle to cool completely in a well-ventilated area.',
        'Inspect for any visible burn marks, melted plastic, or damaged wiring.',
      ],
      do_not_do: [
        'Do not continue operating the vehicle — stop immediately.',
        'Do not charge the vehicle until the cause is identified.',
        'Do not leave the vehicle unattended while it is still warm.',
        'Do not attempt to operate the vehicle to see if the smell continues.',
      ],
      escalation_trigger: 'Any burning smell — immediate escalation required',
      escalation_required: true,
      recommended_route: 'safety_stop',
      agent_script_opener:
        "I need to stop you right there — please stop using the vehicle immediately and remove your child. Turn it off and disconnect the battery connector if you can do it safely. A burning smell always means we stop first and diagnose second. Are you and your child okay?",
    },

    // ── 15. BATTERY SWELLING — SAFETY ESCALATION ──────────────────────────────
    {
      system_id: 'battery_swelling',
      system_name: 'Battery Swelling',
      component: '12V 7Ah SLA Battery',
      issue_keywords: [
        'swollen battery', 'battery swelling', 'puffy battery', 'battery looks fat',
        'battery expanded', 'battery bloated', 'battery deformed',
      ],
      issue_description: 'The battery appears swollen, puffy, or deformed',
      photo_required: true,
      video_required: false,
      media_instructions: [
        'Photo of the battery from the side showing the swelling',
        'Photo of the battery label showing model and voltage',
        'Photo of the battery compartment',
      ],
      possible_causes: [
        'Overcharging — charger mismatch or leaving on charge for days',
        'End-of-life battery failure — SLA batteries can swell when they age',
        'Deep discharge damage',
        'Heat exposure — leaving vehicle in direct sun',
      ],
      safe_owner_steps: [
        'Stop using and charging the vehicle immediately.',
        'Do not attempt to charge a swollen battery.',
        'Remove the battery from the vehicle if safe to do so — do not puncture or squeeze it.',
        'Dispose of the battery at a proper battery recycling facility — do not put in household trash.',
        'Do not leave a swollen battery indoors unattended.',
      ],
      do_not_do: [
        'Do not continue charging a swollen battery — it can leak acid or rupture.',
        'Do not puncture, cut, or attempt to open the battery.',
        'Do not put a swollen battery in the trash or a sealed container.',
        'Do not allow children near the swollen battery.',
      ],
      escalation_trigger: 'Any visible battery swelling — immediate escalation required',
      escalation_required: true,
      recommended_route: 'safety_stop',
      agent_script_opener:
        "Please stop using and charging the vehicle right now. A swollen battery is a safety issue and we need to replace it before the vehicle is used again. Can you remove the battery from the vehicle and set it aside in a well-ventilated area while we get a replacement sent to you?",
    },
  ],
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Find the best matching knowledge entry for a given issue type or description.
 */
export function matchKnowledgeEntry(
  issueType: string,
  description: string = ''
): KnowledgeEntry | null {
  const searchText = `${issueType} ${description}`.toLowerCase()

  let bestMatch: KnowledgeEntry | null = null
  let bestScore = 0

  for (const entry of DEMO_VEHICLE.systems) {
    let score = 0
    // Exact system_id match is highest priority
    if (issueType === entry.system_id) score += 10
    for (const keyword of entry.issue_keywords) {
      if (searchText.includes(keyword.toLowerCase())) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = entry
    }
  }

  return bestMatch
}

/**
 * Determine if a photo or video should be requested based on issue type.
 */
export function shouldRequestMedia(
  issueType: string,
  description: string = ''
): {
  requestPhoto: boolean
  requestVideo: boolean
  mediaInstructions: string[]
} {
  const entry = matchKnowledgeEntry(issueType, description)
  if (!entry) {
    return {
      requestPhoto: true,
      requestVideo: false,
      mediaInstructions: ['Photo of the vehicle showing the issue area'],
    }
  }
  return {
    requestPhoto: entry.photo_required,
    requestVideo: entry.video_required,
    mediaInstructions: entry.media_instructions,
  }
}

/**
 * Check if the issue type requires immediate safety escalation.
 */
export function isSafetyEscalation(issueType: string, description: string = ''): boolean {
  const safetyIds = ['burning_smell', 'battery_swelling']
  if (safetyIds.includes(issueType)) return true
  const safetyKeywords = ['smoke', 'sparks', 'burning', 'swollen', 'melting', 'fire']
  return safetyKeywords.some(kw => description.toLowerCase().includes(kw))
}

/**
 * Get vehicle display string.
 */
export function getVehicleDisplayName(): string {
  return DEMO_VEHICLE.display_name
}

/**
 * Get the knowledge base as a formatted string for the AI prompt.
 */
export function getKnowledgeBasePrompt(): string {
  const entries = DEMO_VEHICLE.systems
    .map(
      (s) => `
ISSUE: ${s.system_name}
System ID: ${s.system_id}
Component(s): ${s.component}
Description: ${s.issue_description}
Possible Causes: ${s.possible_causes.join('; ')}
Safe Owner Steps: ${s.safe_owner_steps.join('; ')}
Do Not Do: ${s.do_not_do.join('; ')}
Escalation Trigger: ${s.escalation_trigger}
Recommended Route: ${s.recommended_route}
`
    )
    .join('\n---\n')

  return `PRODUCT: ${DEMO_VEHICLE.display_name}
SPECS: Battery ${DEMO_VEHICLE.specifications['Battery']}, Motors ${DEMO_VEHICLE.specifications['Motors']}, Weight Limit ${DEMO_VEHICLE.specifications['Weight Capacity']}, Age ${DEMO_VEHICLE.specifications['Age Range']}

TROUBLESHOOTING ORDER: ${DEMO_VEHICLE.troubleshooting_order.join(' → ')}

KNOWLEDGE BASE:
${entries}`
}
