#!/usr/bin/env node
const { assertContextKwok, batchApply } = require('./helpers');

function eventYaml(index, now) {
  const objectKinds = ['Pod', 'Deployment', 'Node', 'Job'];
  const reasons = ['FailedScheduling', 'BackOff', 'Unhealthy', 'Started'];
  const objectKind = objectKinds[index % objectKinds.length];
  const reason = reasons[index % reasons.length];
  const node = `kwok-node-${index % 1000}`;

  return `apiVersion: v1
kind: Event
metadata:
  name: lorem-event-${index}-${now.getTime()}
  namespace: default
type: Warning
reason: ${reason}
message: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
source:
  host: ${node}
involvedObject:
  kind: ${objectKind}
  name: load-test-${objectKind.toLowerCase()}-${index}`;
}

/**
 * Creates nonsense events using batch kubectl apply for load testing.
 *
 * @param {number} numEvents - The number of events to create.
 */
function createNonsenseEvents(numEvents) {
  console.log(`Creating ${numEvents} events...`);
  const start = Date.now();
  const now = new Date();

  const yamls = [];
  for (let x = 0; x < numEvents; x++) {
    yamls.push(eventYaml(x, now));
  }
  batchApply(yamls);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Created ${numEvents} events in ${elapsed}s`);
}

if (require.main === module) {
  const yargs = require('yargs');

  yargs
    .scriptName('create-events')
    .usage('$0 <cmd> [args]')
    .command(
      '$0 <numEvents> [sleepInterval]',
      'Create nonsense events for load testing',
      yargs => {
        yargs.positional('numEvents', {
          describe: 'Number of events to create',
          type: 'number',
        });
        yargs.positional('sleepInterval', {
          describe: 'Deprecated, ignored. Kept for backward compatibility.',
          type: 'number',
          default: 0,
        });
      },
      argv => {
        assertContextKwok();
        createNonsenseEvents(argv.numEvents);
      }
    )
    .help().argv;
}

exports.eventYaml = eventYaml;
